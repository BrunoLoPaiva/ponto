import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generatePdfFromNode = async (containerNode, filename) => {
  try {
    const pages = Array.from(containerNode.querySelectorAll(".pdf-page"));
    if (pages.length === 0)
      throw new Error("Nenhuma página encontrada para gerar o PDF");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage("a4", "landscape");

      const canvas = await html2canvas(pages[i], {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 10, 10, 277, 190);
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error("Erro na geração de PDF multi-página", err);
    throw err;
  }
};
