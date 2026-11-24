"use client";

import React, { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
}

/**
 * Tombol hamburger (`Menu`) untuk kolom Aksi pada tabel.
 * Memakai koordinat `fixed` agar dropdown tidak terpotong oleh container `overflow-x-auto`.
 */
export function ActionMenu({ items, ariaLabel = "Menu aksi" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.filter((item) => item !== null && item !== undefined);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleScrollOrResize = () => setOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  if (visibleItems.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192;
      const estimatedHeight = visibleItems.length * 38 + 12;
      const openUpwards = window.innerHeight - rect.bottom < estimatedHeight + 16;

      setCoords({
        top: openUpwards ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      });
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="inline-flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
          open
            ? "border-emerald-800 bg-emerald-50 text-emerald-900"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {visibleItems.map((item, idx) => {
            const colorClass =
              item.variant === "danger"
                ? "text-red-700 hover:bg-red-50"
                : item.variant === "primary"
                  ? "font-semibold text-emerald-900 hover:bg-emerald-50"
                  : "text-slate-700 hover:bg-slate-100";

            return (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${colorClass}`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
