"use client";

import { useEffect, useState } from "react";
import type { Channel } from "./channels";
import { getWASupportLink, isTelegramChannelUrl, isWhatsAppChannelUrl } from "./wa";

export type ChannelDirectoryLink = { telegram?: string; whatsapp?: string };
type ChannelDirectoryState = {
  links: Record<string, ChannelDirectoryLink>;
  /** True when the backend answered; an omitted channel is then intentionally hidden. */
  authoritative: boolean;
};
export type ResolvedChannelLinks = {
  telegram: string;
  whatsapp: string;
  whatsappIsDirect: boolean;
};

/**
 * Load the public, admin-mapped channel links once per page. If the backend is
 * unavailable, use the validated registry links bundled with the frontend.
 * External destination uptime is never inferred from URL syntax.
 */
export function useChannelDirectoryLinks(): ChannelDirectoryState {
  const [state, setState] = useState<ChannelDirectoryState>({ links: {}, authoritative: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/channels/join", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (!payload || typeof payload !== "object" || !("success" in payload) || payload.success !== true) return;
        const rawLinks = "links" in payload && payload.links && typeof payload.links === "object"
          ? payload.links as Record<string, unknown>
          : {};
        const links: Record<string, ChannelDirectoryLink> = {};
        for (const [key, raw] of Object.entries(rawLinks)) {
          if (!raw || typeof raw !== "object") continue;
          const record = raw as Record<string, unknown>;
          const telegram = typeof record.telegram === "string" && isTelegramChannelUrl(record.telegram)
            ? record.telegram
            : "";
          const whatsapp = typeof record.whatsapp === "string" && isWhatsAppChannelUrl(record.whatsapp)
            ? record.whatsapp
            : "";
          if (telegram || whatsapp) links[key] = { telegram, whatsapp };
        }
        setState({ links, authoritative: true });
      })
      .catch(() => {
        // Keep the registry fallback; never fabricate or probe an external URL.
      });

    return () => controller.abort();
  }, []);

  return state;
}

/** Resolve both homepage and directory cards through the same link policy. */
export function resolveChannelLinks(
  channel: Channel,
  directory: ChannelDirectoryState,
): ResolvedChannelLinks {
  const configured = directory.links[channel.key];
  const telegramCandidate = directory.authoritative
    ? configured?.telegram || ""
    : channel.link;
  const telegram = isTelegramChannelUrl(telegramCandidate) ? telegramCandidate : "";

  const whatsappCandidate = directory.authoritative
    ? configured?.whatsapp || ""
    : channel.whatsappLink;
  const directWhatsApp = isWhatsAppChannelUrl(whatsappCandidate) ? whatsappCandidate : "";
  const entryIsEnabled = !directory.authoritative || Boolean(configured);
  const supportFallback = entryIsEnabled ? getWASupportLink(channel.key) : "";
  const whatsapp = directWhatsApp || supportFallback;

  return {
    telegram,
    whatsapp,
    whatsappIsDirect: Boolean(directWhatsApp),
  };
}
