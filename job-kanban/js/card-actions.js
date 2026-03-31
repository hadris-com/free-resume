export function createCardActions({ store, modalController, announce, getTranslation }) {
  function handleAction(action, cardId) {
    if (!cardId) {
      return false
    }

    if (action === "show-details") {
      modalController.openCardDetails(cardId)
      return true
    }

    if (action === "apply-card") {
      modalController.openApplyCard(cardId)
      return true
    }

    if (action === "discard-card") {
      modalController.openCloseCard({ cardId, mode: "discard" })
      return true
    }

    if (action === "start-process" || action === "add-step") {
      modalController.openStepEditor({ cardId })
      return true
    }

    if (action === "close-card") {
      modalController.openCloseCard({ cardId, mode: "close" })
      return true
    }

    if (action === "reopen-card") {
      const reopenedCard = store.reopenCard(cardId)

      if (reopenedCard) {
        announce(getTranslation("announcements.reopened", { company: reopenedCard.company }), "success")
      }

      return true
    }

    return false
  }

  return {
    handleAction
  }
}
