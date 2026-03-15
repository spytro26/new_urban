import { Router } from "express";
import { upload } from "../middleware/upload.middleware.ts";
import { userMiddleware } from "../middleware/user.middleware.ts";
import { agentMiddleware } from "../middleware/agent.middleware.ts";
import {
  uploadUserProfilePic,
  uploadAgentProfilePic,
  uploadAgentDocuments,
} from "../controllers/auth/upload.controller.ts";

const router = Router();

// User: upload profile picture
// Form field name: "profilepic"
router.post(
  "/user/profile",
  userMiddleware,
  upload.single("profilepic"),
  uploadUserProfilePic
);

// Agent: upload profile picture
// Form field name: "profilepic"
router.post(
  "/agent/profile",
  agentMiddleware,
  upload.single("profilepic"),
  uploadAgentProfilePic
);

// Agent: upload id_proof and address_proof together
// Form field names: "id_proof" and "address_proof"
router.post(
  "/agent/documents",
  agentMiddleware,
  upload.fields([
    { name: "id_proof", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
  ]),
  uploadAgentDocuments
);

export default router;
