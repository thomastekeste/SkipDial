import { useRef, useState, useCallback } from "react";
import type { Lead, ScriptSection } from "../lib/types";
import { ThemeToggle } from "./ThemeToggle";
import { BoltIcon, CheckIcon } from "./Icons";
import { UserButton } from "@clerk/nextjs";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  scriptSections: ScriptSection[];
  onGoScriptSetup: () => void;
  onFileLoaded: (file: File) => void;
  onLoadDemo: () => void;
  leads: Lead[];
}

export function UploadView({
  isDark,
  onToggleTheme,
  scriptSections,
  onGoScriptSetup,
  onFileLoaded,
  onLoadDemo,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasScript = scriptSections.length > 0;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileLoaded(file);
    },
    [onFileLoaded]
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        <UserButton />
      </div>
      <div className="animate-pulse-glow absolute h-52 w-52 rounded-full bg-[#22C55E]/10 blur-3xl" />
      <div className="animate-fade-in-up relative z-10 flex flex-col items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-[#22C55E]/20 dark:bg-[#1C1C1C]">
          <BoltIcon size={32} />
        </div>
        <h1 className="mb-1.5 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">SkipDial</h1>
        <p className="mb-10 text-sm font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
          Stop dialing. Start closing.
        </p>

        <div className="w-full max-w-sm space-y-4">
          {/* Step 1: Script */}
          <button
            onClick={onGoScriptSetup}
            className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
              hasScript
                ? "border-[#22C55E]/30 bg-[#22C55E]/5 shadow-sm dark:border-[#22C55E]/20 dark:bg-[#22C55E]/5"
                : "border-[var(--border)] bg-[var(--card)] shadow-sm hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                hasScript
                  ? "bg-[#22C55E] text-white"
                  : "bg-zinc-100 text-zinc-400 dark:bg-[#252525] dark:text-zinc-500"
              }`}
            >
              {hasScript ? <CheckIcon /> : "1"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {hasScript ? "Script ready" : "Set up your script"}
              </h3>
              <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                {hasScript
                  ? `${scriptSections.length} section${scriptSections.length === 1 ? "" : "s"} · tap to edit`
                  : "Add your call script first"}
              </p>
            </div>
            <span className="text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400">
              &rarr;
            </span>
          </button>

          {/* Step 2: CSV */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? "border-[#22C55E] bg-[#22C55E]/5 shadow-lg shadow-[#22C55E]/10 dark:bg-[#22C55E]/10"
                : "border-[var(--border)] bg-[var(--card)] shadow-sm hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileLoaded(f);
              }}
            />
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-400 dark:bg-[#252525] dark:text-zinc-500">
                2
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Upload your leads</h3>
                <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                  CSV with NAME, PHONE, DOB, STATE
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onLoadDemo}
          className="mt-6 text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          Load demo data
        </button>
      </div>
    </div>
  );
}
