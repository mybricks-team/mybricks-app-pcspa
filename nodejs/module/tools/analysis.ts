export function getRealHostName(requestHeaders) {
  let hostName = requestHeaders.host;
  if (requestHeaders["x-forwarded-host"]) {
    hostName = requestHeaders["x-forwarded-host"];
  } else if (requestHeaders["x-host"]) {
    hostName = requestHeaders["x-host"].replace(":443", "");
  }
  return hostName;
}

/** 有问题找zouyongsheng */
export function getRealDomain(request) {
  let hostName = getRealHostName(request.headers);
  const { origin } = request.headers;
  if (origin) return origin;
  // let protocol = request.headers['x-scheme'] ? 'https' : 'http'
  /** TODO: 暂时写死 https */
  // let protocol = 'https';
  let protocol =
    request.headers?.["connection"].toLowerCase() === "upgrade"
      ? "https"
      : "http";
  let domain = `${protocol}:\/\/${hostName}`;
  return domain;
}

export function getNextVersion(version, max = 100) {
  if (!version) return "1.0.0";
  const vAry = version.split(".");
  let carry = false;
  const isMaster = vAry.length === 3;
  if (!isMaster) {
    max = -1;
  }

  for (let i = vAry.length - 1; i >= 0; i--) {
    const res = Number(vAry[i]) + 1;
    if (i === 0) {
      vAry[i] = res;
    } else {
      if (res === max) {
        vAry[i] = 0;
        carry = true;
      } else {
        vAry[i] = res;
        carry = false;
      }
    }
    if (!carry) break;
  }

  return vAry.join(".");
}

/**
 * 获取文本中所有 URL
 * @param str 被处理的文本
 * @returns 文本中的所有 URL
 */
export function analysisAllUrl(str: string): string[] {
  return (
    str.match(
      /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g
    ) || []
  );
}
