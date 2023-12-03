import React, { useEffect, useState } from "react";
import {
  Button,
  Dimensions,
  View,
  Text,
  StyleSheet,
  TextInput,
} from "react-native";
import { GameEngine } from "react-native-game-engine";
import { DeviceMotion } from "expo-sensors";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { database, app, storage } from "./firebase";
import { getStorage } from "firebase/storage";
import {
  addDoc,
  updateDoc,
  getFirestore,
  query,
  collection,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

//web
//device / emulator

let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export default function App() {
  const { width, height } = Dimensions.get("window");
  const [isAvailable, setIsAvailable] = useState(false);
  const [motionData, setMotionData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const [highscore, setHighscore] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("white");
  const [ballColor, setBallColor] = useState("red");
  const backColors = ["orange", "green", "blue", "yellow", "purple"];
  const ballColors = ["red", "pink", "black", "white", "cyan"];
  const [enteredEmail, setEnteredEmail] = useState("mandatory2@gmail.com");
  const [enteredPassword, setEnteredPassword] = useState("mandatory");
  const [userId, setUserId] = useState(null);
  const [documentId, setDocumentId] = useState("");

  useEffect(() => {
    const auth_ = getAuth();
    const unsubscribe = onAuthStateChanged(auth_, (currentUser) => {
      if (currentUser) {
        setUserId(currentUser.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe(); // kalders når komponentet unmountes
  }, []);

  async function retrieveHighscoreFromUser(uid) {
    if (!uid) {
      console.log("User ID is not set. Cannot retrieve highscore.");
      return;
    }

    try {
      const db = getFirestore(app);
      const highscoreDocRef = doc(db, "highscores", uid);
      const docSnap = await getDoc(highscoreDocRef);

      if (docSnap.exists()) {
        console.log(
          "Highscore for user:",
          uid,
          "is",
          docSnap.data().highScoreText
        );
        setHighscore(docSnap.data().highScoreText);
        return docSnap.data().highScoreText;
      } else {
        console.log("No highscore document found for user:", uid);
        return 0; // You can return 0 or any default value you want for highscore
      }
    } catch (error) {
      console.error("Error retrieving highscore:", error);
      return 0; // Return a default value in case of an error
    }
  }

  // Update the highscore in Firebase only if it is higher than the stored one
  async function updateHighscoreInFirebase() {
    if (userId && highscore > 0) {
      const db = getFirestore(app);
      const highscoreDoc = doc(db, "highscores", userId);
      const docSnap = await getDoc(highscoreDoc);

      if (!docSnap.exists() || docSnap.data().highScoreText < highscore) {
        await setDoc(highscoreDoc, {
          highScoreText: highscore,
        });
      }
    }
  }

  async function login() {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        enteredEmail,
        enteredPassword
      );
      console.log("logget ind " + userCredential.user.uid);
      setUserId(userCredential.user.uid);
      retrieveHighscoreFromUser(userCredential.user.uid);
    } catch (error) {}
  }

  async function signup() {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        enteredEmail,
        enteredPassword
      );
      console.log("oprettet " + userCredential.user.uid);

      // Opret et nyt dokument i 'highscores'-collection
      const db = getFirestore(app);
      const highscoreDocRef = doc(db, "highscores", userCredential.user.uid);
      await setDoc(highscoreDocRef, {
        highScoreText: 0, // Initial highscore kan sættes til 0 eller en anden værdi
      });
      console.log(
        "Highscore dokument oprettet for bruger",
        userCredential.user.uid
      );
    } catch (error) {
      console.error("Fejl under oprettelse af bruger:", error);
    }
  }

  async function sign_out() {
    setHighscore(0);
    setTimer(0);
    await signOut(auth);
  }

  const ball = {
    position: {
      x: width / 2 - 25,
      y: height / 2 - 25,
    },
    size: 50,
    velocity: {
      x: 0.2,
      y: 0.2,
    },
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: ballColor, // Use the ballColor state
            position: "absolute",
            left: position.x,
            top: position.y,
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        ></View>
      );
    },
  };

  const bat = {
    position: {
      x: width / 2,
      y: height,
    },
    size: 150,
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: "red",
            position: "absolute",
            left: position.x, //Sætter battet i midten
            top: height - 60,
            width: size,
            height: size / 5,
            borderRadius: size / 2,
          }}
        ></View>
      );
    },
  };

  const topBat = {
    position: {
      x: width / 2,
      y: height,
    },
    size: 100,
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: "black",
            position: "absolute",
            left: position.x, //Sætter battet i midten
            top: 120,
            width: size,
            height: size / 5,
            borderRadius: size / 2,
          }}
        ></View>
      );
    },
  };
  useEffect(() => {
    async function subscribe() {
      const available = await DeviceMotion.isAvailableAsync();
      setIsAvailable(available);
      //gem i usestate
      if (available) {
        //Vi bruger availabe og ikke isAvailable, da den ikke kan nå at sætte og hente den nye værdi
        DeviceMotion.setUpdateInterval(10); // 10 millisekund pause imellem hver update
        DeviceMotion.addListener((deviceMotionData) => {
          setMotionData(deviceMotionData);
        });
      }
    }
    subscribe();
    return () => {
      DeviceMotion.removeAllListeners();
    };
  }, []); // skal kun køre en gang derfor [], det er en mekanisme

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    if (timer > highscore) {
      setHighscore(timer);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Function to get a random color from an array
  function getRandomColor(colorsArray) {
    const randomIndex = Math.floor(Math.random() * colorsArray.length);
    return colorsArray[randomIndex];
  }

  const update = (entities, { time }) => {
    const batEntity = entities.bat;
    const ballEntity = entities.ball;
    const topBatEntity = entities.topBat;

    ballEntity.position.x += ballEntity.velocity.x * time.delta;
    ballEntity.position.y += ballEntity.velocity.y * time.delta;

    if (ballEntity.position.x < 0) {
      //venstre side
      ballEntity.velocity.x = Math.abs(ballEntity.velocity.x);
    }

    if (ballEntity.position.x + ballEntity.size > width) {
      //højre side
      ballEntity.velocity.x = -1 * Math.abs(ballEntity.velocity.x);
    }

    // Handle ball collision with top bat
    if (ballEntity.position.y < topBatEntity.size / 5 + 120) {
      if (
        ballEntity.position.x > topBatEntity.position.x - 30 &&
        ballEntity.position.x < topBatEntity.position.x + topBatEntity.size + 30
      ) {
        setBackgroundColor(getRandomColor(backColors));

        // Reverse the direction of the ball
        ballEntity.velocity.y = -ballEntity.velocity.y;

        // Increase the speed of the ball
        ballEntity.velocity.x *= 1.4; // Increase horizontal speed by 40%
      } else if (ballEntity.position.y < topBat.position.y) {
        setIsRunning(false); // Game over
      }
    }

    if (
      ballEntity.position.y + ballEntity.size >
      height - batEntity.size / 5 - 35
    ) {
      //bunden
      if (
        ballEntity.position.x > batEntity.position.x - 30 &&
        ballEntity.position.x < batEntity.position.x + batEntity.size + 30
      ) {
        ballEntity.velocity.y = -1 * Math.abs(ballEntity.velocity.y);
        setBackgroundColor(getRandomColor(backColors));
        ballEntity.velocity.y *= 1.4; // Increase vertical speed by 40%
      } else if (
        ballEntity.position.y + ballEntity.size >
        batEntity.position.y - batEntity.size
      ) {
        //game Running
        setIsRunning(false);
      }
    }

    //Bat
    let newPosition = 100;
    if (isAvailable && motionData) {
      newPosition = 250 * motionData.rotation.gamma + 150; // gamma: -1 til +1
    }
    if (!isNaN(newPosition)) {
      //kun hvis newPositoon er et tal, gå videre
      batEntity.position.x = newPosition;
    }

    topBatEntity.position.x = entities.bat.position.x;

    return entities;
  };

  function playAgain() {
    setIsRunning(true);
    setTimer(0); // Reset timer when the game starts again
  }
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.timerText}>Timer: {timer}</Text>
      <Text style={styles.highScoreText}>Highscore: {highscore}</Text>

      <GameEngine
        running={isRunning}
        key={isRunning ? "game running" : "game stopped"}
        systems={[update]}
        entities={{ ball, bat, topBat }}
        style={{ flex: 1, backgroundColor: backgroundColor }} // Use the backgroundColor state
      />
      {!isRunning && (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "white", // Sets the background color of the view
            position: "absolute", // Position it over the game
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Text style={styles.title}>Welcome to the Game!</Text>

          {!userId && (
            <>
              <View style={styles.formContainer}>
                <TextInput
                  placeholder="Email"
                  onChangeText={(newText) => setEnteredEmail(newText)}
                  value={enteredEmail}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Password"
                  onChangeText={(newText) => setEnteredPassword(newText)}
                  value={enteredPassword}
                  style={styles.input}
                />
                <Button title="Login" onPress={login} />
                <Button title="Sign up" onPress={signup} />
              </View>
              <StatusBar style="auto" />
            </>
          )}

          <Button title="Play Now!" onPress={playAgain} />

          {userId && (
            <>
              <Button title="Save game" onPress={updateHighscoreInFirebase} />

              <StatusBar style="auto" />
              <Button title="Sign Out" onPress={sign_out} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "black",
    marginBottom: 20,
  },
  playButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  playButtonText: {
    color: "black",
    fontSize: 18,
  },
  timerText: {
    color: "black",
    fontSize: 20,
    position: "absolute",
    top: 40,
    alignSelf: "center",
    zIndex: 1,
  },
  highScoreText: {
    color: "black",
    fontSize: 20,
    position: "absolute",
    top: 80,
    alignSelf: "center",
    zIndex: 1,
  },
  formContainer: {
    backgroundColor: "rgba(192, 192, 192, 0.4)", // Semi-transparent gray background
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 0, // Remove shadow for Android
  },
  
  input: {
    backgroundColor: "rgba(255, 255, 255, 1)", // White background for input fields
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    borderColor: "gray",
    borderWidth: 1,
    width: 200, // Adjust the width to make them wider
  },
  
});
