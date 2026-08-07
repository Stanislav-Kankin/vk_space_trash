import bridge, {
  parseURLSearchParamsForGetLaunchParams,
  type Insets,
  type ParentConfigData,
  type VKBridgeSubscribeHandler,
} from '@vkontakte/vk-bridge'

export const VK_VISIBILITY_EVENT = 'cosmic-scavenger:vk-visibility'

const applyInsets = (insets?: Insets) => {
  const root = document.documentElement
  root.style.setProperty('--vk-inset-top', `${insets?.top ?? 0}px`)
  root.style.setProperty('--vk-inset-right', `${insets?.right ?? 0}px`)
  root.style.setProperty('--vk-inset-bottom', `${insets?.bottom ?? 0}px`)
  root.style.setProperty('--vk-inset-left', `${insets?.left ?? 0}px`)
}

const applyConfig = (config: ParentConfigData) => {
  document.documentElement.dataset.vkAppearance = config.appearance
  document.documentElement.dataset.vkAppId = config.app_id
  if ('insets' in config) applyInsets(config.insets)
  if ('viewport_height' in config) {
    document.documentElement.style.setProperty('--vk-viewport-height', `${config.viewport_height}px`)
  }
}

const notifyVisibility = (visible: boolean) => {
  window.dispatchEvent(new CustomEvent(VK_VISIBILITY_EVENT, { detail: { visible } }))
}

export async function initVKRuntime() {
  const queryLaunchParams = parseURLSearchParamsForGetLaunchParams(window.location.search)
  if (queryLaunchParams.vk_platform) document.documentElement.dataset.vkPlatform = queryLaunchParams.vk_platform
  if (queryLaunchParams.vk_app_id) document.documentElement.dataset.vkAppId = String(queryLaunchParams.vk_app_id)

  const bridgeHandler: VKBridgeSubscribeHandler = (event) => {
    switch (event.detail.type) {
      case 'VKWebAppUpdateConfig':
        applyConfig(event.detail.data)
        break
      case 'VKWebAppUpdateInsets':
        applyInsets(event.detail.data.insets)
        break
      case 'VKWebAppViewHide':
        notifyVisibility(false)
        break
      case 'VKWebAppViewRestore':
        notifyVisibility(true)
        break
    }
  }

  bridge.subscribe(bridgeHandler)
  const initialized = await bridge.send('VKWebAppInit').then(() => true).catch(() => false)
  if (!initialized || !bridge.isEmbedded()) return

  await bridge.send('VKWebAppSetViewSettings', {
    status_bar_style: 'light',
    action_bar_color: '#0a1012',
    navigation_bar_color: '#0a1012',
  }).catch(() => undefined)

  const [config, launchParams] = await Promise.allSettled([
    bridge.send('VKWebAppGetConfig'),
    bridge.send('VKWebAppGetLaunchParams'),
  ])

  if (config.status === 'fulfilled') applyConfig(config.value)
  if (launchParams.status === 'fulfilled') {
    document.documentElement.dataset.vkPlatform = launchParams.value.vk_platform
    document.documentElement.dataset.vkAppId = String(launchParams.value.vk_app_id)
  }
}

export async function setVKSwipeBack(enabled: boolean) {
  if (!bridge.isEmbedded()) return
  const method = enabled ? 'VKWebAppEnableSwipeBack' : 'VKWebAppDisableSwipeBack'
  await bridge.send(method).catch(() => undefined)
}
