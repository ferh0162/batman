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
import { doc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
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
  const [enteredEmail, setEnteredEmail] = useState("admin@gmail.com");
  const [enteredPassword, setEnteredPassword] = useState("admin123");
  const [userId, setUserId] = useState(null);
  const [enteredText, setEnteredText] = useState("");

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

  async function addHighscore() {
    try {
      await addDoc(collection(database, userId), {
        highScoreText: highscore,
      });
    } catch (error) {
      console.log("error i document " + error);
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
    } catch (error) {}
  }

  async function sign_out() {
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
    size: 100,
    renderer: (props) => {
      const { position, size } = props;
      return (
        <View
          style={{
            backgroundColor: "black",
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
            top: 60,
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
        DeviceMotion.setUpdateInterval(20); // 20 millisekund pause imellem hver update
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
    if (ballEntity.position.y < topBatEntity.size / 5 + 55) {
      if (
        ballEntity.position.x > topBatEntity.position.x &&
        ballEntity.position.x < topBatEntity.position.x + topBatEntity.size
      ) {
        setBackgroundColor(getRandomColor(backColors));
        setBallColor(getRandomColor(ballColors));

        // Reverse the direction of the ball
        ballEntity.velocity.y = -ballEntity.velocity.y;

        // Increase the speed of the ball
        ballEntity.velocity.x *= 1.2; // Increase horizontal speed by 10%
        ballEntity.velocity.y *= 1.2; // Increase vertical speed by 10%
      } else if (ballEntity.position.y < 0) {
        setIsRunning(false); // Game over
      }
    }

    if (
      ballEntity.position.y + ballEntity.size >
      height - batEntity.size / 5 - 35
    ) {
      //bunden
      if (
        ballEntity.position.x > batEntity.position.x &&
        ballEntity.position.x < batEntity.position.x + batEntity.size
      ) {
        ballEntity.velocity.y = -1 * Math.abs(ballEntity.velocity.y);
      } else if (ballEntity.position.y + ballEntity.size > height + 50) {
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
          <Text style={styles.highScoreText}>Highscore: {highscore}</Text>
          <Text style={styles.title}>Welcome to the Game!</Text>

          <Button title="Play again" onPress={playAgain} />
          {!userId && (
            <>
              <Text>Login</Text>
              <TextInput
                placeholder="Email"
                onChangeText={(newText) => setEnteredEmail(newText)}
                value={enteredEmail}
              />
              <TextInput
                placeholder="Password"
                onChangeText={(newText) => setEnteredPassword(newText)}
                value={enteredPassword}
              />
              <Button title="Login" onPress={login} />
              <TextInput
                placeholder="Email"
                onChangeText={(newText) => setEnteredEmail(newText)}
                value={enteredEmail}
              />
              <TextInput
                placeholder="Password"
                onChangeText={(newText) => setEnteredPassword(newText)}
                value={enteredPassword}
              />
              <Button title="Sign up" onPress={signup} />
              <StatusBar style="auto" />
            </>
          )}
          {userId && (
            <>
              <Button title="Save game" onPress={addHighscore} />

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
});
