import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "../context/AppContext";

const icons = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: TriangleAlert,
  info: Info
};

export default function Toast() {
  const { toast, setToast } = useApp();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast, setToast]);

  if (!toast) return null;
  const Icon = icons[toast.type] || Info;

  return (
    <div className={`toast ${toast.type}`}>
      <Icon size={18} />
      <span>{toast.message}</span>
      <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
}
