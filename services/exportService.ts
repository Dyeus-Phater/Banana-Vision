
import html2canvas from 'html2canvas';

export const exportToPng = async (element: HTMLElement, fileName: string): Promise<void> => {
  if (!element) {
    console.error("Element to capture is null.");
    return;
  }

  // Assign a temporary ID to the element for locating it in the cloned document
  const tempId = `h2c-capture-target-${Date.now()}`;
  element.setAttribute('id', tempId);

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Make canvas background transparent
      useCORS: true,
      scale: 2, // Existing scale factor
      logging: false, // Set to true for debugging html2canvas issues
      onclone: (clonedDocument: Document) => {
        const clonedElement = clonedDocument.getElementById(tempId);
        if (clonedElement) {
          // Ensure the cloned main element (zoom wrapper) itself has a transparent background
          // to prevent it from causing a "white line" if it's slightly larger than its content
          // due to scaling or subpixel rendering.
          clonedElement.style.setProperty('background-color', 'transparent', 'important');

          const clonedContentBox = clonedElement.querySelector<HTMLElement>('.preview-box');
          if (clonedContentBox) {
            // Remove border from the cloned .preview-box
            clonedContentBox.style.setProperty('border', 'none', 'important');

            // Find and hide guide lines within the cloned .preview-box
            // Guide lines are direct children of .preview-box and have .border-dashed and .border-red-500 classes
            const guides = clonedContentBox.querySelectorAll<HTMLElement>(':scope > div.border-dashed.border-red-500');
            guides.forEach(guide => {
              guide.style.setProperty('display', 'none', 'important');
            });
          }
        }
      },
    });

    // Clean up the temporary ID from the original element
    element.removeAttribute('id');

    const image = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = image;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error exporting to PNG:', error);
    alert('Failed to export to PNG. See console for details.');
    // Ensure cleanup of the temporary ID in case of an error
    element.removeAttribute('id');
  }
};
