import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export type FuzzyTime = undefined | "before" | "after" | "both";

export interface LanguagePack {
  letterSet: String[][];
  timeString(hours: number, minutes: number, settings: Settings): String;
}

export type Settings = {
  round: boolean;
  fuzzyTime: FuzzyTime;
};

@customElement("lit-clock")
export default class LitClock extends LitElement {
  static languagePacks = new Map<string, LanguagePack>();

  static addLanguagePack(langCode: string, languagePack: LanguagePack) {
    this.languagePacks.set(langCode, languagePack);
  }

  static override get styles() {
    return css`
      #wrapper {
        display: grid;
        grid-template-columns: auto 1fr auto;
        grid-template-rows: auto 1fr auto;
        grid-template-areas: "min1 . min2" ". letters ." "min3 . min4";
        color: #ddd;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        height: 100%;
      }

      #minutePoint1 {
        grid-area: min1;
      }

      #minutePoint2 {
        grid-area: min2;
      }

      #minutePoint3 {
        grid-area: min3;
      }

      #minutePoint4 {
        grid-area: min4;
      }

      #letterSet {
        grid-area: letters;
        display: grid;
        --columns: 1;
        grid-template-columns: repeat(var(--columns), 1fr);
        grid-auto-rows: 1fr;
        place-items: center;
        width: 100%;
        height: 100%;
      }

      .minutePoint {
        width: 1rem;
        aspect-ratio: 1;
        border-radius: 50%;
        /* opacity: 0; */
        background-color: #ddd;
      }

      .minutePoint--on {
        background-color: #000;
        opacity: 1;
      }

      .letter {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
      }

      .letter--on {
        color: #000;
      }
    `;
  }

  @property({ type: Boolean })
  round = false;

  @property({ type: Boolean })
  showMinutePoints = true;

  @property({ type: Boolean })
  stencilMode = true;

  @property({ type: String })
  fuzzyTime: FuzzyTime = "both";

  @property({ type: String })
  override lang = "DE";

  @property({ type: Number })
  updateInterval = 1000;

  @state()
  minutePointsVisible = 0;

  @state()
  activeRanges: { start: number; end: number }[] = [];

  updateIntervalRegistration?: ReturnType<typeof setInterval>;

  get languagePack() {
    const langPack = LitClock.languagePacks.get(this.lang);
    return langPack;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.updateClock();
    // I know that setInterval is not perfect and drifts (in most browsers), but since
    // this only requires minute exact timings and not second exact timing, this should be fine.
    this.updateIntervalRegistration = setInterval(
      () => this.requestUpdate(),
      this.updateInterval
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.updateIntervalRegistration) {
      clearInterval(this.updateIntervalRegistration);
    }
  }

  updateClock() {
    const date = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    this.minutePointsVisible = minutes % 5;

    const timeString =
      this.languagePack?.timeString(hours, minutes, {
        fuzzyTime: this.fuzzyTime,
        round: this.round,
      }) || "";

    const indices = this.wordsToIndices(timeString.split(" "));
    this.activeRanges = indices;
  }

  wordsToIndices(timeWords: string[]): { start: number; end: number }[] {
    const res: { start: number; end: number }[] = [];
    if (!this.languagePack) return res;

    const rowWords = this.languagePack.letterSet.map((row) => row.join(""));

    let currentRowWord = rowWords.shift();
    if (!currentRowWord) return res;

    let globalOffset = 0;

    for (let i = 0; i < timeWords.length; i++) {
      const word = timeWords[i];
      const start = currentRowWord.indexOf(word);
      if (start !== -1) {
        res.push({
          start: globalOffset + start,
          end: globalOffset + start + word.length - 1,
        });
        globalOffset += start + word.length;
        currentRowWord = currentRowWord?.slice(start + word.length);
      } else {
        globalOffset += currentRowWord.length;
        currentRowWord = rowWords.shift();
        i--;
        if (!currentRowWord) return res;
      }
    }

    return res;
  }

  isCharActive(index: number) {
    for (const activeRange of this.activeRanges) {
      if (activeRange.start <= index && activeRange.end >= index) {
        return true;
      }
    }
    return false;
  }

  override render() {
    this.updateClock();
    const minutePoints = [];

    for (let i = 1; i <= 4; i++) {
      const parts = `minutePoint minutePoint--${
        this.minutePointsVisible >= i ? "on" : "off"
      }`;
      minutePoints.push(html`<div
        id="minutePoint${i}"
        class="${parts}"
        part="${parts}"
      ></div>`);
    }

    const letters = [];

    for (const [i, letter] of (
      this.languagePack?.letterSet.flat() || []
    ).entries()) {
      const parts = `letter letter--${this.isCharActive(i) ? "on" : "off"}`;
      letters.push(html`<span class="${parts}" part="${parts}"
        >${letter}</span
      >`);
    }

    return html`
      <div id="wrapper" part="mainGrid">
        ${this.showMinutePoints ? minutePoints : ""}
        <div
          id="letterSet"
          part="letterSet"
          style="--columns: ${this.languagePack?.letterSet[0].length}"
        >
          ${letters}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lit-clock": LitClock;
  }
}
