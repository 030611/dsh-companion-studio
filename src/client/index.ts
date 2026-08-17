import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { CompanionHeaderToggle, CompanionOverlay } from './CompanionOverlay.tsx'
import { getCompanionPackRegistry } from './packs.ts'
import { CompanionController } from './settings.ts'
import { installCompanionStyles } from './styles.ts'
import { IndexedDbUserPetRepository, UserPetManager } from './user-pets.ts'

export const inject = ['slots', 'sessions']

/** Install one global overlay and one independent recovery toggle in the session header. */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'sessions'], (scope: ClientContext) => {
    const controller = new CompanionController(window.localStorage)
    const packs = getCompanionPackRegistry()
    const userPets = new UserPetManager(new IndexedDbUserPetRepository())
    void userPets.hydrate().catch(error => {
      console.warn('[dsh-companion-studio] Could not restore local pets', error)
    })
    const injected = () => ({
      hooks: {
        companion: controller,
        packs,
        provideInfo: scope.sessions.currentProvideInfo,
      },
      patch: controller.patch.bind(controller),
      show: controller.show.bind(controller),
      dock: controller.dock.bind(controller),
      hide: controller.hide.bind(controller),
      importUserPet: userPets.importFile.bind(userPets),
      removeUserPet: userPets.remove.bind(userPets),
    })

    scope.effect(() => installCompanionStyles(), 'companion-studio: styles')
    scope.effect(() => () => { userPets.dispose() }, 'companion-studio: user pets')
    scope.slots.inject('shell.overlay', () => scope.slots.register({
      name: 'shell.overlay',
      id: 'companion-studio',
      order: 120,
      inject: injected,
    }, CompanionOverlay))
    scope.slots.inject('conversation.session.header.utilities', () => scope.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'companion-studio-toggle',
      order: 90,
      inject: injected,
    }, CompanionHeaderToggle))
  })
}
