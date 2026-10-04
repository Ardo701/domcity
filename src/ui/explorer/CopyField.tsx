"use client";

import { useId, useRef, useState } from "react";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import styles from "./explorer.module.css";

/** A read-only link and its "Copy" button. */
export function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const m = useMessages(CITY).copy;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      input.current?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={`${styles.copyField} ${secret ? styles.copySecret : ""}`}>
      <label htmlFor={id} className="mono-caps">
        {label}
      </label>
      <div>
        <input id={id} ref={input} readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={copy}>
          {copied ? m.copied : m.copy}
        </button>
      </div>
    </div>
  );
}
