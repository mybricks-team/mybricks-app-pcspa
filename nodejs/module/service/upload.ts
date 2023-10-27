import axios from "axios";
import { getUploadService } from "../tools/get-app-config";
const FormData = require("form-data");

export async function upload(req, { file }, { groupId = "" } = {}) {
  const uploadService = await getUploadService();
  const formData = new FormData();
  formData.append("file", file);
  return await axios<any, { url: string }>({
    url: uploadService,
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      token: req.headers.token,
      session: req.headers.session,
    },
  });
}
