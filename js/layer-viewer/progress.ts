
type Progress = {anmFilesTotal: number, anmFilesDone: number, remainingFilenames: string[]};

type Action =
  | {type: 'image-loaded'}
  | {type: 'spec/finished'}
  | {type: 'spec/finished'}
  ;

class Status {
  private $elem;
  constructor($elem: HTMLElement) {
    this.$elem = $elem;
  }

  set(cssClass: 'idle' | 'working', text: string, filenamesText: string) {
    const $mainText = this.$elem.querySelector('.main-text')! as HTMLElement;
    const $filenamesText = this.$elem.querySelector('.filenames-text')! as HTMLElement;
    this.$elem.classList.remove('idle', 'working');
    this.$elem.classList.add(cssClass);
    $mainText.innerText = text;
    $filenamesText.innerText = filenamesText;
  }

  setFromProgress({anmFilesDone, anmFilesTotal, remainingFilenames}: Progress) {
    const endPunctuation = anmFilesDone === anmFilesTotal ? '!' : '...';
    const cssClass = anmFilesDone === anmFilesTotal ? 'idle' : 'working';
    const mainText = `Processed ${anmFilesDone} of ${anmFilesTotal} anm files${endPunctuation}`;

    let filenamesText = "";
    if (remainingFilenames.length > 0) {
      const numToShow = 7;
      const filenamesEllipsis = remainingFilenames.length > numToShow ? ", ..." : "";
      filenamesText = "(working: " + remainingFilenames.slice(0, numToShow).join(", ") + filenamesEllipsis + ")";
    }
    this.set(cssClass, mainText, filenamesText);
  }
}


// Reading zip file...

// * pl01.anm - Parsing...
// * pl01.anm - Loading textures...
// * pl01.anm - Generating sprites... (..........   )
