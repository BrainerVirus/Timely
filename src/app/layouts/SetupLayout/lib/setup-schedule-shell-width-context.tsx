import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type SetupScheduleShellWidth = "default" | "wide";

const SetupScheduleShellWidthSetterContext = createContext<Dispatch<
  SetStateAction<SetupScheduleShellWidth>
> | null>(null);

export function SetupScheduleShellWidthSetterProvider({
  children,
  value,
}: Readonly<{
  children: ReactNode;
  value: Dispatch<SetStateAction<SetupScheduleShellWidth>>;
}>) {
  return (
    <SetupScheduleShellWidthSetterContext.Provider value={value}>
      {children}
    </SetupScheduleShellWidthSetterContext.Provider>
  );
}

export function useSetupScheduleShellWidthSetter(): Dispatch<
  SetStateAction<SetupScheduleShellWidth>
> {
  const ctx = useContext(SetupScheduleShellWidthSetterContext);
  if (!ctx) {
    throw new Error(
      "useSetupScheduleShellWidthSetter must be used within SetupScheduleShellWidthSetterProvider",
    );
  }
  return ctx;
}
