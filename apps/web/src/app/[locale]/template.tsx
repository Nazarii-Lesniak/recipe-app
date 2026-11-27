import type { ReactNode } from "react";

export default function LocaleTemplate({ children }: { children: ReactNode }) {
  return <div className="page-transition flex flex-1 flex-col">{children}</div>;
}
