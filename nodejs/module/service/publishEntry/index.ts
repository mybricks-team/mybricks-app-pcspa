import { createComboScript } from "./createComboScript";
import handleTemplate from "./handleTemplate"
import initParam from "./initParam"
import { Logger } from "@mybricks/rocker-commons";
import { pushProcessor } from "./push";
import saveRoll from "./saveRollbackData";
import { TContext, TProcessor } from "./type";
import { localization } from "./localization";

const publish = async (ctx: TContext) => {

  await comboProcess(
    initParam,
    handleTemplate,
    createComboScript,
    localization,
    pushProcessor,
    saveRoll,
  )(ctx)

  const { fileId, envType, version, result } = ctx
  return {
    ...result,
    fileId,
    envType,
    version,
  }
}

const comboProcess = (...processes: Array<TProcessor>) => async (ctx: TContext) => {
  try {
    for (let process of processes) {
      await process(ctx)
    }
  } catch (e) {
    Logger.error(
      `[publish] pcpage publish error ${e?.message || JSON.stringify(e, null, 2)
      }`
    );
    throw e;
  }

}

export default publish
