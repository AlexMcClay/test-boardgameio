import { useEffect, useState } from "react";
import {
  DECK_SIZE,
  decodeDeckCode,
  encodeDeckCode,
  type Card as CardType,
  type DeckCodeDeck,
  type DeckString,
  type Hero,
  type SavedDeck,
} from "@project/shared";
import { useAudioStore } from "@/stores/audioStore";
import { useDeckStore } from "@/stores/deckStore";
import { useViewStore } from "@/stores/viewStore";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

import CardZoomModal from "../CardZoomModal";
import MinionCardPopover from "../MinionCardPopover";
import ManaCurvePopover from "../ManaCurvePopover";
import SettingsButton from "../SettingsButton";
import SettingsOverlay from "../SettingsOverlay";

import CardCollectionPanel from "./CardCollectionPanel";
import ClassFilterBar from "./ClassFilterBar";
import ClipboardDeckModal from "./ClipboardDeckModal";
import CollectionFilterBar from "./CollectionFilterBar";
import DeckContentsPanel from "./DeckContentsPanel";
import DeckEditorControls from "./DeckEditorControls";
import DeckLibraryPanel from "./DeckLibraryPanel";
import DeckStartModal from "./DeckStartModal";
import HeroSelectModal from "./HeroSelectModal";
import { useCardBrowser } from "./useCardBrowser";
import { useCardPreview } from "./useCardPreview";
import { useDeckEditor } from "./useDeckEditor";
import {
  backgroundImage,
  sheet,
  woodButtonClass,
  woodButtonLabelClass,
  type Mode,
} from "./constants";

/** Which step of the create-a-deck flow is on screen, if any. */
type CreationStep =
  | { step: "clipboard"; deck: DeckCodeDeck }
  | { step: "hero" }
  | { step: "source"; hero: Hero }
  | null;

const CollectionManager = () => {
  const [mode, setMode] = useState<Mode>("viewer");
  const [creationStep, setCreationStep] = useState<CreationStep>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [zoomedCard, setZoomedCard] = useState<{
    card: CardType;
    originRect: DOMRect;
  } | null>(null);

  const playSfx = useAudioStore((state) => state.playSfx);
  const setGlobalTrack = useAudioStore((state) => state.setGlobalTrack);
  const setView = useViewStore((state) => state.setView);
  const { saveUserDeck, deleteUserDeck, reorderUserDecks, getAllDecks } =
    useDeckStore();

  const editor = useDeckEditor();
  const browser = useCardBrowser(mode, editor.selectedHero);
  const preview = useCardPreview(mode === "card-select");

  useBackgroundMusic({ autoplay: true });

  useEffect(() => {
    setGlobalTrack("assets/audio/music/Collection_Manager.ogg");
  }, [setGlobalTrack]);

  function openEditor() {
    setMode("card-select");
    browser.reset();
  }

  function closeEditor() {
    setMode("viewer");
    editor.clearEditor();
    browser.reset();
  }

  function handleBackToMenu() {
    playSfx("button-click");
    setView("main-menu");
  }

  /**
   * Copy the deck being edited as a shareable code.
   * Returns false if the browser denied clipboard access.
   */
  async function handleCopyDeckCode(): Promise<boolean> {
    if (!editor.selectedHero) return false;
    try {
      await window.navigator.clipboard.writeText(
        encodeDeckCode({
          name: editor.deckName.trim() || `${editor.selectedHero.class} Deck`,
          hero: editor.selectedHero,
          deckString: editor.deck,
        }),
      );
      return true;
    } catch (error) {
      console.error("Failed to copy deck code:", error);
      return false;
    }
  }

  async function handleCreateNewDeck() {
    playSfx("button-click");

    // Offer the clipboard deck first, if there is one. Reading the clipboard
    // can be denied or unavailable (it needs a secure context), in which case
    // we just fall through to the normal flow.
    try {
      const clipboardText = await window.navigator.clipboard.readText();
      const clipboardDeck = decodeDeckCode(clipboardText);
      if (clipboardDeck) {
        setCreationStep({ step: "clipboard", deck: clipboardDeck });
        return;
      }
    } catch {
      // No clipboard access — not an error worth surfacing.
    }

    setCreationStep({ step: "hero" });
  }

  function handleUseClipboardDeck() {
    if (creationStep?.step !== "clipboard") return;
    playSfx("button-click");
    const { deck } = creationStep;
    editor.startNewDeck(deck.hero, {
      name: deck.name,
      deckString: deck.deckString,
    });
    setCreationStep(null);
    openEditor();
  }

  function handleSelectHero(hero: Hero) {
    playSfx("button-click");
    setCreationStep({ step: "source", hero });
  }

  function handleStartEmpty() {
    if (creationStep?.step !== "source") return;
    playSfx("button-click");
    editor.startNewDeck(creationStep.hero);
    setCreationStep(null);
    openEditor();
  }

  function handleCopyStarter(starter: {
    name: string;
    deckString: DeckString;
  }) {
    if (creationStep?.step !== "source") return;
    playSfx("button-click");
    editor.startNewDeck(creationStep.hero, starter);
    setCreationStep(null);
    openEditor();
  }

  function handleEditDeck(
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    savedDeck: SavedDeck,
  ) {
    e.stopPropagation();
    e.preventDefault();
    playSfx("button-click");
    editor.startEditingDeck(savedDeck);
    openEditor();
  }

  function handleDeleteDeck(deckId: string, event: React.MouseEvent) {
    event.stopPropagation();
    playSfx("button-click");
    if (confirm("Are you sure you want to delete this deck?")) {
      deleteUserDeck(deckId);
    }
  }

  function handleSaveDeck() {
    playSfx("button-click");

    const savedDeck = editor.buildSavedDeck();
    if (!savedDeck) {
      alert(
        !editor.selectedHero
          ? "Please select a hero!"
          : "Please enter a deck name!",
      );
      return;
    }

    saveUserDeck(savedDeck);
    closeEditor();
  }

  function handleCancelEdit() {
    playSfx("button-click");
    closeEditor();
  }

  function handleComplete() {
    playSfx("button-click");
    editor.complete();
  }

  function handleClassSelect(className: string) {
    playSfx("collection-manager-page-flip");
    browser.jumpToClass(className);
  }

  function handleManaFilterSelect(bucket: number) {
    playSfx("collection-manager-page-flip");
    browser.selectManaFilter(bucket);
  }

  function handlePreviousPage() {
    if (browser.currentPage > 0) {
      playSfx("collection-manager-page-flip");
      browser.setCurrentPage(browser.currentPage - 1);
    }
  }

  function handleNextPage() {
    if (browser.currentPage < browser.totalPages - 1) {
      playSfx("collection-manager-page-flip");
      browser.setCurrentPage(browser.currentPage + 1);
    }
  }

  const isEditing = mode === "card-select";

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "multiply",
        background: "black",
      }}
    >
      <img
        src={backgroundImage}
        className="absolute z-[0]"
        alt="Background"
        draggable={false}
      />
      <img
        src={sheet}
        className="absolute z-[0] left-[12vw] w-[57.5vw]"
        alt="Sheet"
        draggable={false}
      />

      <ClassFilterBar
        mode={mode}
        selectedHero={editor.selectedHero}
        activeClass={browser.activeClass}
        availableClasses={browser.availableClasses}
        onSelectClass={handleClassSelect}
      />

      <div className="absolute bg-gradient-to-t pointer-events-none from-black/60 h-[1.5vh] w-[56vw] left-[12.6vw] top-[4.5vh] pl-[1vw]" />

      <CardCollectionPanel
        mode={mode}
        activeClass={browser.activeClass}
        displayedCards={browser.displayedCards}
        currentPage={browser.currentPage}
        totalPages={browser.totalPages}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onAddCard={editor.addCard}
        onZoomCard={(card, originRect) => setZoomedCard({ card, originRect })}
      />

      <CollectionFilterBar
        selectedManaFilter={browser.selectedManaFilter}
        searchQuery={browser.searchQuery}
        onSelectManaFilter={handleManaFilterSelect}
        onSearch={browser.search}
      />

      {isEditing && editor.selectedHero && (
        <DeckEditorControls
          selectedHero={editor.selectedHero}
          editingDeck={editor.editingDeck}
          deckName={editor.deckName}
          totalCards={editor.totalCards}
          setDeckName={editor.setDeckName}
          onCopyDeckString={() =>
            window.navigator.clipboard.writeText(
              JSON.stringify(editor.deck, null, 2),
            )
          }
          onCopyDeckCode={handleCopyDeckCode}
          onDeckMouseEnter={preview.handleDeckMouseEnter}
          onDeckMouseLeave={preview.handleDeckMouseLeave}
        />
      )}

      {/* Right panel: deck library in viewer mode, decklist while editing */}
      <div className="w-[13.2vw] h-[83vh] rounded-lg p-[1vw] flex flex-col items-center gap-[1vw] absolute left-[70.5vw] top-[7vh] overflow-y-auto">
        {!isEditing && (
          <DeckLibraryPanel
            decks={getAllDecks()}
            onEditDeck={handleEditDeck}
            onDeleteDeck={handleDeleteDeck}
            onCreateNewDeck={handleCreateNewDeck}
            onReorderDecks={reorderUserDecks}
          />
        )}

        {isEditing && (
          <>
            <DeckContentsPanel
              deck={editor.deck}
              totalCards={editor.totalCards}
              onRemoveCard={editor.removeCard}
              onEntryMouseEnter={preview.handleEntryMouseEnter}
              onEntryMouseLeave={preview.handleEntryMouseLeave}
            />

            {/* Only worth offering while the deck is still short of legal. */}
            {!editor.isFull && (
              <button
                onMouseEnter={() => playSfx("button-over")}
                className={`${woodButtonClass} shrink-0 w-full px-[0.8vw] py-[0.4vw]`}
                onClick={handleComplete}
                title={`Fill the remaining ${DECK_SIZE - editor.totalCards} card${
                  DECK_SIZE - editor.totalCards === 1 ? "" : "s"
                }, balancing the mana curve and minion/spell mix`}
              >
                <span
                  className={`${woodButtonLabelClass} text-[1vw] whitespace-nowrap`}
                >
                  Complete Deck
                </span>
                <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
                <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
              </button>
            )}
          </>
        )}
      </div>

      <div className="absolute bottom-[2.4vw] left-[78.9vw] text-[1.25vw] text-white px-[0.5vw] py-[0.25vw] rounded-lg flex gap-[0.4vw]">
        <button
          onMouseEnter={() => playSfx("button-over")}
          className={`${woodButtonClass} py-[0.25vw] w-[7vw] `}
          onClick={isEditing ? handleSaveDeck : handleBackToMenu}
        >
          <span className={`${woodButtonLabelClass} text-[1.25vw]`}>
            {isEditing ? "Save Deck" : "Back"}
          </span>
          <div className="absolute inset-0 rounded-lg border-t-[0.15vw] border-l-[0.15vw] border-white/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-lg border-b-[0.15vw] border-r-[0.15vw] border-black/20 pointer-events-none" />
        </button>

        {/* Every deck is editable, so there has to be a way out without saving. */}
        {isEditing && (
          <button
            onMouseEnter={() => playSfx("button-over")}
            className="relative w-[7vw]  py-[0.15vw] bg-[#8d7037]/70 rounded-lg border-[0.2vw] border-[#5c4033] transition-all duration-200 hover:brightness-125"
            onClick={handleCancelEdit}
          >
            <span className="text-[0.9vw] font-bold text-amber-100/90">
              Cancel
            </span>
          </button>
        )}
      </div>

      {isEditing && (
        <div className="absolute bottom-[3.2vw] left-[72vw] text-[1.25vw] text-white px-[0.5vw] py-[0.25vw] rounded-lg flex flex-col gap-0">
          <div>
            <span>{editor.totalCards}</span>
            <span> / {DECK_SIZE}</span>
          </div>
          <span className="text-[0.8vw] absolute bottom-[-0.5vh] left-[1.2vw]">
            Cards
          </span>
        </div>
      )}

      {creationStep?.step === "clipboard" && (
        <ClipboardDeckModal
          deck={creationStep.deck}
          onYes={handleUseClipboardDeck}
          onNo={() => {
            playSfx("button-click");
            setCreationStep({ step: "hero" });
          }}
        />
      )}

      {creationStep?.step === "hero" && (
        <HeroSelectModal
          onSelectHero={handleSelectHero}
          onCancel={() => setCreationStep(null)}
        />
      )}

      {creationStep?.step === "source" && (
        <DeckStartModal
          hero={creationStep.hero}
          onStartEmpty={handleStartEmpty}
          onCopyStarter={handleCopyStarter}
          onBack={() => setCreationStep({ step: "hero" })}
        />
      )}

      {/* Right-click zoom, rendered via portal to document.body */}
      <CardZoomModal
        card={zoomedCard?.card ?? null}
        originRect={zoomedCard?.originRect ?? null}
        onClose={() => setZoomedCard(null)}
      />

      {isEditing && preview.hoveredCard && (
        <MinionCardPopover
          key="collection-card-preview"
          card={preview.hoveredCard}
          position={preview.popoverPosition}
          animate={false}
        />
      )}

      {isEditing && preview.showManaCurve && editor.selectedHero && (
        <ManaCurvePopover
          deck={editor.deck}
          position={preview.manaCurvePosition}
          hero={editor.selectedHero}
        />
      )}

      <SettingsButton setIsSettingsOpen={setIsSettingsOpen} />
      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default CollectionManager;
