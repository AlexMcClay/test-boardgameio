import { useEffect, useState } from "react";
import {
  DECK_SIZE,
  type Card as CardType,
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
type CreationStep = { step: "hero" } | { step: "source"; hero: Hero } | null;

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
  const { saveUserDeck, deleteUserDeck, getAllDecks } = useDeckStore();

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

  function handleCreateNewDeck() {
    playSfx("button-click");
    setCreationStep({ step: "hero" });
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

  function handleCopyStarter(starter: { name: string; deckString: DeckString }) {
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

  function handleGenerate() {
    playSfx("button-click");
    editor.generate();
  }

  function handleComplete() {
    playSfx("button-click");
    editor.complete();
  }

  function handleClassSelect(className: string) {
    playSfx("collection-manager-page-flip");
    browser.selectClass(className);
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
        selectedClass={browser.selectedClass}
        onSelectClass={handleClassSelect}
      />

      <div className="absolute bg-gradient-to-t pointer-events-none from-black/60 h-[1.5vh] w-[56vw] left-[12.6vw] top-[4.5vh] pl-[1vw]" />

      <CardCollectionPanel
        mode={mode}
        selectedClass={browser.selectedClass}
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
          isFull={editor.isFull}
          setDeckName={editor.setDeckName}
          onGenerate={handleGenerate}
          onComplete={handleComplete}
          onCopyDeckString={() =>
            window.navigator.clipboard.writeText(
              JSON.stringify(editor.deck, null, 2),
            )
          }
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
          />
        )}

        {isEditing && (
          <DeckContentsPanel
            deck={editor.deck}
            totalCards={editor.totalCards}
            onRemoveCard={editor.removeCard}
            onEntryMouseEnter={preview.handleEntryMouseEnter}
            onEntryMouseLeave={preview.handleEntryMouseLeave}
          />
        )}
      </div>

      <div className="absolute bottom-[2.4vw] left-[78.9vw] w-[8vw] text-[1.25vw] text-white px-[0.5vw] py-[0.25vw] rounded-lg flex flex-col gap-[0.4vw]">
        <button
          onMouseEnter={() => playSfx("button-over")}
          className={`${woodButtonClass} py-[0.25vw]`}
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
            className="relative py-[0.15vw] bg-[#8d7037]/70 rounded-lg border-[0.2vw] border-[#5c4033] transition-all duration-200 hover:brightness-125"
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
