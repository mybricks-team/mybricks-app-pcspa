import React from "react";
import type { ToolRecord } from "../../../../../../../../../../plugin-ai/packages/plugin/src/ui/chat/messages/tool-renders";
import {
  PendingCodeCard,
  CodeCard,
} from "../../../../../../../../../../plugin-ai/packages/plugin/src/ui/chat/messages/tool-renders/shared";
import { FileIcon } from "../../../../../../../../../../plugin-ai/packages/plugin/src/ui/components/icons";

function getPreviewContent(tool: ToolRecord) {
  if (typeof tool.result?.output === "string" && tool.result.output) {
    return tool.result.output;
  }

  return "";
}

export function renderOperateApiTool(tool: ToolRecord) {
  if (tool.status === "pending") {
    return <PendingCodeCard tool={tool} icon={<FileIcon />} title={tool?.progress?.message || "正在操作接口..."} />;
  }

  return (
    <CodeCard
      tool={tool}
      icon={<FileIcon />}
      title={tool.title || "操作接口"}
      content={getPreviewContent(tool)}
      showCode={Boolean(getPreviewContent(tool))}
    />
  );
}
