import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";

import { fireEvent } from "../../../../common/dom/fire_event";
import { haStyleDialog } from "../../../../resources/styles";
import { showSuggestCardDialog } from "./show-suggest-card-dialog";

import type { LovelaceViewConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import {
  EditCardDialogParams,
  showEditCardDialog,
} from "./show-edit-card-dialog";

import "./hui-card-picker";
import "./hui-entity-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-header-bar";

declare global {
  interface HASSDomEvents {
    "selected-changed": SelectedChangedEvent;
  }
}

interface SelectedChangedEvent {
  selectedEntities: string[];
}

@customElement("hui-dialog-create-card")
export class HuiCreateDialogCard extends LitElement implements HassDialog {
  @property({ attribute: false }) protected hass!: HomeAssistant;

  @internalProperty() private _params?: EditCardDialogParams;

  @internalProperty() private _viewConfig!: LovelaceViewConfig;

  @internalProperty() private _selectedEntities: string[] = [];

  @internalProperty() private _currTabIndex = 0;

  public async showDialog(params: EditCardDialogParams): Promise<void> {
    this._params = params;
    const [view] = params.path;
    this._viewConfig = params.lovelaceConfig.views[view];
  }

  public closeDialog(): boolean {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
        .heading=${true}
      >
        <div slot="heading">
          <ha-header-bar>
            <div slot="title">
              ${this._viewConfig.title
                ? this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.pick_card_view_title",
                    "name",
                    `"${this._viewConfig.title}"`
                  )
                : this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.pick_card"
                  )}
            </div>
          </ha-header-bar>
          <mwc-tab-bar
            .activeIndex=${this._currTabIndex}
            @MDCTabBar:activated=${(ev: CustomEvent) =>
              this._handleTabChanged(ev)}
          >
            <mwc-tab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.by_card"
              )}
            ></mwc-tab>
            <mwc-tab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.by_entity"
              )}
            ></mwc-tab>
          </mwc-tab-bar>
        </div>
        ${this._currTabIndex === 0
          ? html`
              <hui-card-picker
                .lovelace=${this._params.lovelaceConfig}
                .hass=${this.hass}
                @config-changed=${this._handleCardPicked}
              ></hui-card-picker>
            `
          : html`
              <hui-entity-picker
                .hass=${this.hass}
                @selected-changed=${this._handleSelectedChanged}
              ></hui-entity-picker>
            `}

        <div slot="primaryAction">
          <mwc-button @click=${this._cancel}>
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          ${this._currTabIndex === 1
            ? html`
                <mwc-button @click=${this._suggestCards}>
                  ${this.hass!.localize("ui.common.continue")}
                </mwc-button>
              `
            : ""}
        </div>
      </ha-dialog>
    `;
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            --mdc-dialog-max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 850px) {
          ha-dialog {
            --mdc-dialog-min-width: 845px;
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 845px;
        }

        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }

        @media (min-width: 1200px) {
          ha-dialog {
            --mdc-dialog-max-width: calc(100% - 32px);
            --mdc-dialog-min-width: 1000px;
          }
        }

        .header_button {
          color: inherit;
          text-decoration: none;
        }

        mwc-tab-bar {
          padding-top: 8px;
        }
      `,
    ];
  }

  private _handleCardPicked(ev) {
    const config = ev.detail.config;
    if (this._params!.entities && this._params!.entities.length) {
      if (Object.keys(config).includes("entities")) {
        config.entities = this._params!.entities;
      } else if (Object.keys(config).includes("entity")) {
        config.entity = this._params!.entities[0];
      }
    }

    showEditCardDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path,
      cardConfig: config,
    });

    this.closeDialog();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.index;
    if (newTab === this._currTabIndex) {
      return;
    }

    this._currTabIndex = ev.detail.index;
    this._selectedEntities = [];
  }

  private _handleSelectedChanged(ev: CustomEvent): void {
    this._selectedEntities = ev.detail.selectedEntities;
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
  }

  private _suggestCards(): void {
    showSuggestCardDialog(this, {
      lovelaceConfig: this._params!.lovelaceConfig,
      saveConfig: this._params!.saveConfig,
      path: this._params!.path as [number],
      entities: this._selectedEntities,
    });

    this.closeDialog();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-card": HuiCreateDialogCard;
  }
}