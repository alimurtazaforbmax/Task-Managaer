import type { ReactNode } from "react";

interface PageContainerProps {
  readonly children: ReactNode;
  readonly size?: "md" | "lg" | "full";
}

const SIZES = {
  md: "max-w-4xl",
  lg: "max-w-5xl",
  full: "max-w-7xl",
};

export default function PageContainer({ children, size = "full" }: PageContainerProps) {
  return <div className={`mx-auto w-full ${SIZES[size]} px-0 sm:px-2`}>{children}</div>;
}
