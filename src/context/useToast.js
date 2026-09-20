import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);

  function notify(message, type = "success") {
    setToast({ id: crypto.randomUUID(), message, type });
  }

  return { toast, setToast, notify };
}
