// 阿里云 NLS Token 管理 — 自动生成 + 缓存
// 用于 /api/nls-token 和 /api/stt 共享

interface CachedToken {
  expireTime: number; // epoch ms
  id: string;
}

let _cachedToken: CachedToken | null = null;

export async function getNlsToken(): Promise<string> {
  // 缓存有效时直接返回（提前 5 分钟刷新）
  if (_cachedToken && Date.now() < _cachedToken.expireTime - 300_000) {
    console.log("[NLS Token] 使用缓存");
    return _cachedToken.id;
  }

  console.log("[NLS Token] 请求新 Token…");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RPCClient } = require("@alicloud/pop-core");

  const client = new RPCClient({
    accessKeyId: process.env.ALIYUN_AK_ID || "",
    accessKeySecret: process.env.ALIYUN_AK_SECRET || "",
    endpoint: "http://nls-meta.cn-shanghai.aliyuncs.com",
    apiVersion: "2019-02-28",
  });

  const result = await client.request("CreateToken");
  _cachedToken = {
    id: result.Token.Id as string,
    expireTime: (result.Token.ExpireTime as number) * 1000,
  };

  console.log(
    `[NLS Token] 已更新，过期: ${new Date(_cachedToken.expireTime).toISOString()}`
  );
  return _cachedToken.id;
}
