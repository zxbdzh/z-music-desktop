<template lang="pug">
dt#wy {{ $t('setting__wy') }}
dd
  h3#wy_service_title {{ $t('setting__wy_service_title') }}
  div
    .p
      span(:class="$style.tip") {{ $t('setting__wy_service_desc') }}
    .p(:class="$style.serviceRow")
      base-input(
        id="setting_wy_api_base"
        v-model="apiBaseUrl"
        :placeholder="$t('setting__wy_service_placeholder')"
        :disabled="isTestingApi"
        :class="$style.serviceInput"
        @update:model-value="handleApiInput"
      )
      div(:class="$style.serviceActions")
        base-btn(min :disabled="isTestingApi || !apiBaseUrl.trim()" @click="handleSaveApiBaseUrl") {{ $t('setting__wy_service_save') }}
        base-btn(min :disabled="isTestingApi || !appSetting['wy.apiBaseUrl']" @click="handleClearApiBaseUrl") {{ $t('setting__wy_service_clear') }}
        base-btn(min :loading="isTestingApi" :disabled="isTestingApi || !apiBaseUrl.trim()" @click="handleTestApiConnection")
          span(v-if="isTestingApi") {{ $t('setting__wy_service_testing') }}
          span(v-else) {{ $t('setting__wy_service_test') }}
    .p(v-if="apiUsesPlainHttp")
      span(:class="$style.warning") {{ $t('setting__wy_service_http_warning') }}
    .p(v-if="apiValidationError" role="alert")
      span(:class="$style.error") {{ $t('setting__wy_service_invalid') }}
    .p(v-else-if="apiStatus" role="status" aria-live="polite")
      span(:class="$style.status") {{ apiStatusText }}

  h3#wy_login_title {{ $t('setting__wy_login_title') }}
  div
    .p.gap-top
      span {{ $t('setting__wy_login_status') }}:
      span(:class="$style.status") {{ loginStatus }}
    .p.gap-top(v-if="!appSetting['common.wy_cookie']")
      //- 登录方式切换
      div(:class="$style.tabContainer")
        button(
          :class="[$style.tabBtn, { [$style.active]: loginMethod === 'captcha' }]"
          @click="loginMethod = 'captcha'"
        ) {{ $t('setting__wy_login_method_captcha') }}
        button(
          :class="[$style.tabBtn, { [$style.active]: loginMethod === 'cookie' }]"
          @click="loginMethod = 'cookie'"
        ) {{ $t('setting__wy_login_method_cookie') }}

      //- 验证码登录表单
      div(v-if="loginMethod === 'captcha'" :class="$style.formContainer")
        div(:class="$style.inputGroup")
          base-input(
            v-model="phoneNumber"
            :placeholder="$t('setting__wy_login_phone_placeholder')"
            type="tel"
            maxlength="11"
            :class="$style.input"
          )
          base-btn(
            min
            :disabled="!canSendCaptcha"
            @click="handleSendCaptcha"
          )
            span(v-if="captchaCooldown > 0") {{ $t('setting__wy_login_send_captcha_retry', { seconds: captchaCooldown }) }}
            span(v-else) {{ $t('setting__wy_login_send_captcha') }}
        div(:class="$style.inputGroup")
          base-input(
            v-model="captchaCode"
            :placeholder="$t('setting__wy_login_captcha_placeholder')"
            type="tel"
            maxlength="6"
            :class="$style.input"
          )
        div(:class="$style.inputGroup")
          base-btn(
            min
            :disabled="isLoading || !isCaptchaValid"
            @click="handleCaptchaLogin"
          ) {{ $t('setting__wy_login_btn') }}

      //- Cookie 登录按钮
      div(v-if="loginMethod === 'cookie'")
        base-btn(min @click="showManualInput") {{ $t('setting__wy_login_manual') }}

    .p.gap-top
      span(:class="$style.tip") {{ $t('setting__wy_login_tip') }}
    .p.gap-top(v-if="appSetting['common.wy_cookie']")
      base-btn(min @click="handleLogout") {{ $t('setting__wy_login_logout') }}
    .p.gap-top(v-if="appSetting['common.wy_cookie']")
      base-checkbox(id="setting_wy_enable_scrobble" :model-value="appSetting['common.wy_enableScrobble']" :label="$t('setting__wy_enable_scrobble')" @update:model-value="handleToggleScrobble")
    .p(v-if="appSetting['common.wy_cookie'] && appSetting['common.wy_enableScrobble']")
      span(:class="$style.tip") {{ $t('setting__wy_enable_scrobble_tip') }}
    .p.gap-top(v-if="appSetting['common.wy_cookie'] && appSetting['common.wy_enableScrobble']")
      base-checkbox(id="setting_wy_enable_old_scrobble" :model-value="appSetting['wy.enableOldScrobble']" :label="$t('setting__wy_enable_old_scrobble')" @update:model-value="updateSetting({'wy.enableOldScrobble': $event})")

  //- Cookie 输入弹窗
  material-modal(:show="isShowInputModal" bg-close teleport="#view" @close="closeModal")
    main(:class="$style.modalMain")
      h2 {{ $t('setting__wy_login_input_title') }}
      p {{ $t('setting__wy_login_input_desc') }}
      textarea(
        v-model="cookieInput"
        :class="$style.cookieInput"
        :placeholder="$t('setting__wy_login_input_placeholder')"
      )
      div(:class="$style.modalActions")
        base-btn(min @click="closeModal") {{ $t('cancel') }}
        base-btn(min :disabled="!cookieInput.trim()" @click="handleSaveCookie") {{ $t('confirm') }}
</template>

<script>
import { ref, computed } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { notice } from '@renderer/plugins/Notice'
import { useI18n } from '@root/lang'
import { normalizeWyApiBaseUrl, validateWyApiBaseUrl } from '@renderer/utils/musicSdk/wy/wyApiBase'

export default {
  name: 'SettingWy',
  setup() {
    const t = useI18n()
    const isLoading = ref(false)
    const isShowInputModal = ref(false)
    const cookieInput = ref('')
    const loginMethod = ref('captcha')
    const apiBaseUrl = ref(normalizeWyApiBaseUrl(appSetting['wy.apiBaseUrl']))
    const apiStatus = ref('')
    const apiValidationError = ref(false)
    const isTestingApi = ref(false)

    // 验证码登录
    const phoneNumber = ref('')
    const captchaCode = ref('')
    const captchaCooldown = ref(0)
    let captchaTimer = null

    const isCaptchaValid = computed(() => {
      return captchaCode.value && captchaCode.value.length >= 4
    })

    const isPhoneValid = computed(() => {
      return phoneNumber.value && phoneNumber.value.length === 11
    })

    const canSendCaptcha = computed(() => {
      return captchaCooldown.value === 0 && isPhoneValid.value
    })

    const loginStatus = computed(() => {
      return appSetting['common.wy_cookie']
        ? t('setting__wy_login_logged_in')
        : t('setting__wy_login_not_logged_in')
    })

    const apiStatusText = computed(() => {
      if (apiStatus.value === 'reachable') return t('setting__wy_service_reachable')
      if (apiStatus.value === 'not_logged_in') return t('setting__wy_service_not_logged_in')
      return t('setting__wy_service_failed')
    })

    const apiUsesPlainHttp = computed(() => {
      return apiBaseUrl.value.trim().toLowerCase().startsWith('http://')
    })

    const handleApiInput = () => {
      apiValidationError.value = false
      apiStatus.value = ''
    }

    const handleSaveApiBaseUrl = () => {
      const result = validateWyApiBaseUrl(apiBaseUrl.value)
      if (!result.valid) {
        apiValidationError.value = true
        apiStatus.value = ''
        return
      }

      apiBaseUrl.value = result.value
      apiValidationError.value = false
      apiStatus.value = ''
      updateSetting({ 'wy.apiBaseUrl': result.value })
      notice.success(t('setting__wy_service_saved'), { id: 'setting-wy-service' })
    }

    const handleClearApiBaseUrl = () => {
      apiBaseUrl.value = ''
      apiValidationError.value = false
      apiStatus.value = ''
      updateSetting({ 'wy.apiBaseUrl': '' })
      notice.success(t('setting__wy_service_cleared'), { id: 'setting-wy-service' })
    }

    const handleTestApiConnection = async () => {
      const result = validateWyApiBaseUrl(apiBaseUrl.value)
      if (!result.valid) {
        apiValidationError.value = true
        apiStatus.value = ''
        return
      }

      isTestingApi.value = true
      apiValidationError.value = false
      apiStatus.value = ''
      notice.loading(t('setting__wy_service_testing'), { id: 'setting-wy-connection' })
      try {
        const wyUtilImport = await import('@renderer/utils/musicSdk/wy/wyUtil')
        const connection = await wyUtilImport.default.testApiConnection(result.value)
        apiStatus.value = connection.status
        const message = connection.status === 'reachable'
          ? t('setting__wy_service_reachable')
          : connection.status === 'not_logged_in'
            ? t('setting__wy_service_not_logged_in')
            : t('setting__wy_service_failed')
        notice.update('setting-wy-connection', {
          type: connection.status === 'failed' ? 'error' : 'success',
          message,
        })
      } catch {
        // The utility already redacts transport errors; the UI only exposes a safe state.
        apiStatus.value = 'failed'
        notice.update('setting-wy-connection', {
          type: 'error',
          message: t('setting__wy_service_failed'),
        })
      } finally {
        isTestingApi.value = false
      }
    }

    const showManualInput = () => {
      isShowInputModal.value = true
    }

    const closeModal = () => {
      isShowInputModal.value = false
      cookieInput.value = ''
    }

    const handleSendCaptcha = async () => {
      const phone = phoneNumber.value.trim()
      if (!phone || phone.length !== 11) return

      const wyUtilImport = await import('@renderer/utils/musicSdk/wy/wyUtil')
      const result = await wyUtilImport.default.sendCaptcha(phone)

      if (result.success) {
        notice.success(t('setting__wy_captcha_sent'), { id: 'setting-wy-auth' })
        // 开始倒计时
        captchaCooldown.value = 60
        if (captchaTimer) clearInterval(captchaTimer)
        captchaTimer = setInterval(() => {
          captchaCooldown.value--
          if (captchaCooldown.value <= 0) {
            if (captchaTimer) clearInterval(captchaTimer)
            captchaTimer = null
          }
        }, 1000)
      } else {
        notice.error(result.message || t('setting__wy_login_failed'), { id: 'setting-wy-auth' })
      }
    }

    const handleCaptchaLogin = async () => {
      const phone = phoneNumber.value.trim()
      const captcha = captchaCode.value.trim()
      if (!phone || !captcha) return

      isLoading.value = true
      try {
        const wyUtilImport = await import('@renderer/utils/musicSdk/wy/wyUtil')
        const result = await wyUtilImport.default.loginByCaptcha(phone, captcha)

        if (result.success) {
          updateSetting({ 'common.wy_cookie': result.cookie })
          notice.success(t('setting__wy_login_success'), { id: 'setting-wy-auth' })
          // 清空表单
          phoneNumber.value = ''
          captchaCode.value = ''
          if (captchaTimer) {
            clearInterval(captchaTimer)
            captchaTimer = null
          }
          captchaCooldown.value = 0
        } else {
          notice.error(result.message || t('setting__wy_login_failed'), { id: 'setting-wy-auth' })
        }
      } catch {
        notice.error(t('setting__wy_login_failed'), { id: 'setting-wy-auth' })
      } finally {
        isLoading.value = false
      }
    }

    const handleSaveCookie = async () => {
      const cookie = cookieInput.value.trim()
      if (!cookie) return

      isLoading.value = true
      try {
        // 直接保存 Cookie，不在校验，真实请求时会自动校验
        updateSetting({ 'common.wy_cookie': cookie })
        notice.success(t('setting__wy_login_success'), { id: 'setting-wy-auth' })
        closeModal()
      } catch {
        notice.error(t('setting__wy_login_failed'), { id: 'setting-wy-auth' })
      } finally {
        isLoading.value = false
      }
    }

    const handleLogout = () => {
      updateSetting({ 'common.wy_cookie': '' })
      notice.success(t('setting__wy_login_logout_success'), { id: 'setting-wy-auth' })
    }

    const handleToggleScrobble = (checked) => {
      updateSetting({ 'common.wy_enableScrobble': checked })
    }

    return {
      appSetting,
      updateSetting,
      loginStatus,
      apiBaseUrl,
      apiStatus,
      apiStatusText,
      apiUsesPlainHttp,
      apiValidationError,
      isTestingApi,
      loginMethod,
      phoneNumber,
      captchaCode,
      captchaCooldown,
      isCaptchaValid,
      isPhoneValid,
      canSendCaptcha,
      isLoading,
      isShowInputModal,
      cookieInput,
      showManualInput,
      closeModal,
      handleSendCaptcha,
      handleCaptchaLogin,
      handleSaveCookie,
      handleLogout,
      handleToggleScrobble,
      handleApiInput,
      handleSaveApiBaseUrl,
      handleClearApiBaseUrl,
      handleTestApiConnection,
    }
  },
}
</script>

<style lang="less" module>
.status {
  font-weight: bold;
  color: var(--color-primary);
}

.tip {
  font-size: 12px;
  color: var(--color-font-label);
}

.tabContainer {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tabBtn {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-secondary-background);
  color: var(--color-font-label);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-font);
  }

  &.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
}

.formContainer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inputGroup {
  display: flex;
  gap: 8px;
  align-items: center;
}

.serviceRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.serviceInput {
  flex: 1 1 320px;
  min-width: 220px;
}

.serviceActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.error {
  color: var(--color-danger);
  font-size: 12px;
}

.warning {
  color: var(--color-warning);
  font-size: 12px;
}

.input {
  flex: 1;
}

.modalMain {
  padding: 15px;
  max-width: 500px;
  min-width: 300px;

  h2 {
    font-size: 16px;
    margin-bottom: 15px;
    text-align: center;
  }

  p {
    font-size: 13px;
    color: var(--color-font-label);
    margin-bottom: 15px;
    line-height: 1.5;
  }
}

.cookieInput {
  width: 100%;
  height: 120px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-secondary-background);
  color: var(--color-font);
  font-size: 12px;
  font-family: monospace;
  resize: vertical;
  margin-bottom: 15px;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
