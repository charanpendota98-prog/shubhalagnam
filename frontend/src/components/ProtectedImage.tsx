"use client";

import { useEffect, useState } from "react";
import { getAdminKey, getToken } from "@/lib/api";
import { isSafeSameOriginPath } from "@/lib/safe-media-path";

type ProtectedImageProps = {
  src: string;
  alt: string;
  className?: string;
  admin?: boolean;
};

/**
 * Fetch a same-origin private media URL with the app's owner/admin header, then
 * render it as a short-lived object URL. A plain <img src="/photos/..."> cannot
 * attach those headers and would otherwise encourage making review uploads public.
 */
export default function ProtectedImage({ src, alt, className, admin = false }: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setObjectUrl("");
    setFailed(false);
    // Never attach admin/member auth headers to protocol-relative or otherwise
    // off-origin URLs, even if a backend/CMS value is malformed or user-supplied.
    if (!isSafeSameOriginPath(src, window.location.origin)) {
      setFailed(true);
      return;
    }

    const controller = new AbortController();
    let createdUrl = "";
    const headers: Record<string, string> = {};
    const token = getToken();
    const adminKey = admin ? getAdminKey() : "";
    if (token) headers["X-Tsap-Token"] = token;
    if (adminKey) headers["X-Admin-Key"] = adminKey;

    fetch(src, { headers, cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("protected_media_unavailable");
        return response.blob();
      })
      .then((blob) => {
        if (!blob.type.startsWith("image/")) throw new Error("protected_media_not_image");
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") setFailed(true);
      });

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src, admin]);

  if (objectUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt={alt} className={className} />;
  }
  if (failed) return <span className={className} role="status">{alt}</span>;
  return <span className={className} role="status" aria-label="Loading image" />;
}
