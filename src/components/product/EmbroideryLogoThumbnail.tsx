"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { requestCompanyLogoPreview } from "@/features/company-assets/company-logo-picker.client";
import styles from "./EmbroideryOptions.module.css";

interface Props {
  fileId: string;
  fileName: string;
  position: string;
  previewUrl?: string;
}

/** Resolve by file ID only; filenames can be shared by different customer logos. */
export function EmbroideryLogoThumbnail({ fileId, fileName, position, previewUrl }: Props) {
  const { session } = useAuth();
  const [usePrivatePreview, setUsePrivatePreview] = useState(!previewUrl);
  const [privatePreview, setPrivatePreview] = useState<{ url?: string; failed?: boolean }>({});

  useEffect(() => {
    if (!usePrivatePreview || !session) return;
    const controller = new AbortController();
    void requestCompanyLogoPreview({ fileId, session, signal: controller.signal })
      .then(url => { if (!controller.signal.aborted) setPrivatePreview({ url }); })
      .catch(() => { if (!controller.signal.aborted) setPrivatePreview({ failed: true }); });
    return () => controller.abort();
  }, [fileId, session, usePrivatePreview]);

  const source = usePrivatePreview ? privatePreview.url : previewUrl;
  const unavailable = usePrivatePreview && (privatePreview.failed || !session);

  return <div className={styles.thumbnail}>
    {source && !privatePreview.failed ? (
      // Blob URLs and authenticated file previews cannot use the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={source} alt={`Logo ${position} — ${fileName}`} width={64} height={64} loading="lazy"
        onError={() => {
          if (!usePrivatePreview) setUsePrivatePreview(true);
          else setPrivatePreview({ failed: true });
        }} />
    ) : unavailable ? <span className={styles.thumbnailFallback}>
      <ImageIcon size={18} aria-hidden="true" />
      <span>Pratinjau tidak tersedia</span>
    </span> : <span className={styles.thumbnailLoading} role="status" aria-label={`Memuat logo ${position}`} />}
  </div>;
}
