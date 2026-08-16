import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

export const dynamic = "force-dynamic";

/**
 * Discovers the active local Wi-Fi / Ethernet IPv4 address
 */
function getLocalIpAddress(): string {
  const nets = networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        // Prioritize standard home Wi-Fi/Ethernet ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        if (net.address.startsWith("192.168.") || net.address.startsWith("10.")) {
          // Avoid VirtualBox / VMware host-only adapters (e.g. 192.168.56.x)
          if (!net.address.startsWith("192.168.56.")) {
            return net.address;
          }
          candidates.push(net.address);
        } else {
          candidates.push(net.address);
        }
      }
    }
  }

  return candidates[0] || "192.168.1.6";
}

export async function GET() {
  const ip = getLocalIpAddress();
  const port = process.env.PORT || "3000";
  const url = `http://${ip}:${port}`;
  const libraryUrl = `http://${ip}:${port}/library`;

  return NextResponse.json({
    ip,
    port,
    url,
    libraryUrl,
    hostname: "0.0.0.0",
    message: `Stream live on nearby devices at: ${libraryUrl}`,
  });
}
