import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MAIL_STATUS } from "@/lib/mailbox";

/** Mailbox attachments are downloadable only by the sender and, once sent, by the message's recipients. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await db.mailAttachment.findFirst({
    where: {
      id,
      message: { OR: [{ senderId: user.id }, { status: MAIL_STATUS.SENT, recipients: { some: { userId: user.id } } }] },
    },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      "X-Content-SHA256": file.sha256,
      "Cache-Control": "private, no-store",
    },
  });
}
