# Expo Android App Pre-Launch Checklist

## 1. Production Build

- [y] App does not get stuck on splash screen
- [y] App points to production API/backend
- [y] Debug/test data removed

## 2. UI/UX

- [y] Consistent spacing
- [y] Consistent buttons
- [y] Fonts load correctly in production
- [y] Works in dark/light mode (skipped - app is single-theme)
- [y] Responsive on small and large Android screens
- [y] Keyboard does not block important inputs/buttons
- [y] No placeholder text or dummy content remains

## 3. User Flows

- [y] First-time user flow tested
- [y] Login/signup tested
- [y] Logout tested
- [y] Main app flow tested from start to finish
- [y] Important actions cannot be double-submitted
- [y] User can recover from mistakes

## 4. Loading, Empty, and Error States

- [y] Loading states implemented
- [y] Empty states implemented
- [y] API errors show friendly messages
- [y] No blank screens
- [y] No raw `undefined`, `null`, or JSON errors shown
- [y] Offline message appears when internet is unavailable

## 5. Performance

- [y] No obvious lag on real Android device
- [y] Long lists use FlatList
- [y] Images are optimized
- [y] Unused dependencies removed
- [y] App startup time feels acceptable

## 6. API & Data

- [y] API call errors handled
- [ ] Slow network tested
- [y] Failed important actions can be retried
- [y] Data refresh works correctly
- [y] Stale data is handled properly

## 7. Security

- [y] No private secrets inside the app
- [y] Public env variables checked
- [y] Sensitive user data is not stored in plain AsyncStorage
- [y] Auth/session data cleared on logout
- [y] Backend rules/permissions tested

## 8. Permissions

- [y] Only necessary permissions are requested
- [y] Permission denied state is handled
- [y] User sees a clear explanation when permission is needed

## 9. Navigation

- [y] Android back button works correctly
- [y] No broken navigation loops
- [y] Deep linking tested if applicable
- [y] User can always return to a safe screen

## 10. Accessibility

- [y] Icon-only buttons have accessibility labels
- [y] Text scales reasonably with large font size
- [y] Touchable areas are large enough
- [y] Important screens are usable without perfect vision

## 11. Monitoring

- [y] Crash reporting installed
- [ ] Crash reporting tested in release build
- [y] Important production errors are logged
- [y] Support/contact method exists

## 12. Final Cleanup

- [y] Console logs removed or stripped
- [y] App icon final
- [y] Splash screen final
- [y] Version/build number updated
- [ ] Minimum Android version tested
