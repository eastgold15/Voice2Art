import { NextResponse } from "next/server";
import { getNlsToken } from "@/lib/nls-token";

export async function GET() {
  if (!(process.env.ALIYUN_AK_ID && process.env.ALIYUN_AK_SECRET)) {
    return NextResponse.json(
      {
        error:
          "未配置阿里云 AccessKey，请在 .env.local 中设置 ALIYUN_AK_ID / ALIYUN_AK_SECRET",
      },
      { status: 500 }
    );
  }

  try {
    const token = await getNlsToken();
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
