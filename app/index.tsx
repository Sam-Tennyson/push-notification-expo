import React, { useState, useEffect, useRef } from "react";
import { Text, View, Button, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import Checkbox from "expo-checkbox";
import { Stack } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Function to cancel all scheduled notifications
const cancelAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export default function Page() {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notificationInterval, setNotificationInterval] = useState(5);
  const [notificationRepeats, setNotificationRepeats] = useState(false);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token)
    );

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Can use this function below to test sending a push notification
  async function sendPushNotification(expoPushToken: string) {
    const message = {
      to: expoPushToken,
      sound: "default",
      title: "Original Title",
      body: "And here is the body!",
      data: { someData: "goes here" },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  }

  // This function is triggered on button press to schedule a notification
  const schedulePushNotification = async () => {
    await cancelAllScheduledNotifications();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Don't forget!",
        body: `This is your scheduled notification! ${notificationRepeats} 🚀`,
      },
      trigger: {
        seconds: notificationInterval,
        repeats: notificationRepeats,
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{ title: "Test notifications", headerTitleAlign: "center" }}
      />
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <ThemedText>Your expo push token: {expoPushToken}</ThemedText>
        <Button
          title="Schedule notification after 5 seconds"
          onPress={async () => {
            await schedulePushNotification();
          }}
        />

        <ThemedView
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Checkbox
            style={{ margin: 8 }}
            value={notificationRepeats}
            onValueChange={() => setNotificationRepeats((prev) => !prev)}
          />
          <ThemedText style={{ fontSize: 15 }}> Repeated</ThemedText>
        </ThemedView>
        {/* <Button
        title="Set Repeat false"
        onPress={() => setNotificationRepeats(false)}
      />
      <Button
        title="Set Repeat true"
        onPress={() => setNotificationRepeats(true)}
      /> */}
      </ThemedView>
    </>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}
