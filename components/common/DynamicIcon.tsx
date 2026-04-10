"use client";

import dynamic from "next/dynamic";

interface DynamicIconProps {
  iconName: string; // e.g. "FiHome"  (from react-icons/fi)
  className?: string;
}

export default function DynamicIcon({ iconName, className = "" }: DynamicIconProps) {
  const Icon = dynamic(
    () =>
      import("react-icons/fi").then((mod) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (mod as any)[iconName];
      }),
    { ssr: false }
  );

  const IconComponent = Icon as any;
  return <IconComponent className={className} aria-hidden />;
}
