import { useToast } from "utils/useToast";

export default function useCopyClipboard() {

  const toast = useToast();

  const copyClipboard = (text) => {

    if (navigator.clipboard && window.isSecureContext) {

      navigator.clipboard.writeText(text)
        .then(() => toast.success("Copied to clipboard"))
        .catch(() => fallbackCopy(text));

    } else {
      fallbackCopy(text);
    }

  };

  const fallbackCopy = (text) => {

    const textarea = document.createElement("textarea");
    textarea.value = text;

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      document.execCommand("copy");
      toast.success("Copied to clipboard", {
        anchorOrigin: { vertical: "bottom", horizontal: "left" }
      });
    } catch (err) {
      toast.error("Failed to copy address");
    }

    document.body.removeChild(textarea);
  };

  return copyClipboard;
}