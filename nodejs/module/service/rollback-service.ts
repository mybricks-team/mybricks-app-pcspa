import { Injectable } from "@nestjs/common";
import { Logger } from "@mybricks/rocker-commons";
import JSZip from "jszip";
import axios from "axios";

@Injectable()
export default class RollbackService {
  async rollback(zipUrl: string) {}
}
