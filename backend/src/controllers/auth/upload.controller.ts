import type { Request, Response } from "express";
import { cloudinary } from "../../config/cloudinary.ts";
import { prisma } from "../../../db/index.ts";

// Helper: upload a buffer to Cloudinary and return the secure URL
function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// POST /api/upload/user/profile
// Protected by userMiddleware — req.user.id is the User row id
export async function uploadUserProfilePic(
  req: Request,
  res: Response
): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const userId = req.user!.id;

  const url = await uploadToCloudinary(
    file.buffer,
    "urban/users/profile",
    `user_${userId}_profile`
  );

  await prisma.user.update({
    where: { id: userId },
    data: { profilepic: url },
  });

  res.status(200).json({ message: "Profile picture updated", url });
}

// POST /api/upload/agent/profile
// Protected by agentMiddleware — req.user.id is the Agent row id
export async function uploadAgentProfilePic(
  req: Request,
  res: Response
): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const agentId = req.user!.id;

  const url = await uploadToCloudinary(
    file.buffer,
    "urban/agents/profile",
    `agent_${agentId}_profile`
  );

  await prisma.agent.update({
    where: { id: agentId },
    data: { profilepic: url },
  });

  res.status(200).json({ message: "Profile picture updated", url });
}

// POST /api/upload/agent/documents
// Expects two files in the same request: field names "id_proof" and "address_proof"
// Protected by agentMiddleware
export async function uploadAgentDocuments(
  req: Request,
  res: Response
): Promise<void> {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const idProofFile = files?.["id_proof"]?.[0];
  const addressProofFile = files?.["address_proof"]?.[0];

  if (!idProofFile || !addressProofFile) {
    res.status(400).json({
      message: "Both id_proof and address_proof files are required",
    });
    return;
  }

  const agentId = req.user!.id;

  // Upload both in parallel
  const [idProofUrl, addressProofUrl] = await Promise.all([
    uploadToCloudinary(
      idProofFile.buffer,
      "urban/agents/documents",
      `agent_${agentId}_id_proof`
    ),
    uploadToCloudinary(
      addressProofFile.buffer,
      "urban/agents/documents",
      `agent_${agentId}_address_proof`
    ),
  ]);

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      id_proof: idProofUrl,
      address_proof: addressProofUrl,
    },
  });

  res.status(200).json({
    message: "Documents uploaded successfully",
    id_proof: idProofUrl,
    address_proof: addressProofUrl,
  });
}
