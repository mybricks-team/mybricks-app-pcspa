export default async function download(url: string, fileName: string) {
  return await fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("下载文件失败！");
      }
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch((error) => {
      console.error("下载文件失败，报错信息:", error);
      throw error;
    });
}
