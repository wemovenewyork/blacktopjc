// Web stub — push notifications are not supported on web
export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function scheduleLocalNotification(
  _title: string,
  _body: string,
  _trigger: unknown
): Promise<void> {}
