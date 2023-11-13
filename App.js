import React, { useEffect, useState } from "react";
import { Button, Dimensions, View } from "react-native";
import { GameEngine } from "react-native-game-engine";
import {DeviceMotion} from 'expo-sensors'
import {Audio} from 'expo-av'


export default function App() {

  const { width, height } = Dimensions.get("window");
  const [isAvailable, setIsAvailable] = useState(false)
  const [ motionData, setMotionData] = useState(null)
  const [isRunning, setIsRunning] = useState(true)
  const [sound, setSound] = useState(null)
  const [isRecording, setRecording] = useState(null)



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
          backgroundColor: "red",
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
          height: size/5,
          borderRadius: size / 2,
        }}
      ></View>
    );
  },
};

useEffect(() =>{
  async function subscribe(){
    const available = await DeviceMotion.isAvailableAsync()
    setIsAvailable(available)
    //gem i usestate
    if (available) { //Vi bruger availabe og ikke isAvailable, da den ikke kan nå at sætte og hente den nye værdi
      DeviceMotion.setUpdateInterval(20) // 20 millisekund pause imellem hver update
      DeviceMotion.addListener(deviceMotionData =>{
        setMotionData(deviceMotionData)
      })
    }
  }
  subscribe()
  return () => {
    DeviceMotion.removeAllListeners()
  }
},[]) // skal kun køre en gang derfor [], det er en mekanisme

const update = (entities, { time }) => {
  const batEntity = entities.bat;
  const ballEntity = entities.ball;

  let extra = 5.0 * motionData.rotation.beta / 1.5
  if (isNaN(extra)) { extra = 0.0}

  ballEntity.position.x += ballEntity.velocity.x * time.delta * (1+ extra);
  ballEntity.position.y += ballEntity.velocity.y * time.delta;

  if ( ballEntity.position.x < 0){ //venstre side
    ballEntity.velocity.x = Math.abs(ballEntity.velocity.x)
  }

  if (
    ballEntity.position.x + ballEntity.size > width) { //højre side
    ballEntity.velocity.x = -1 * Math.abs(ballEntity.velocity.x);
  }

  if (
    ballEntity.position.y < 0) { //top
    ballEntity.velocity.y = Math.abs(ballEntity.velocity.y);
  }

  if (ballEntity.position.y + ballEntity.size > height - batEntity.size/5-35) { //bunden
    if (ballEntity.position.x > batEntity.position.x 
      && ballEntity.position.x < batEntity.position.x + batEntity.size) {
      ballEntity.velocity.y = -1 * Math.abs(ballEntity.velocity.y);
    } else if ( ballEntity.position.y + ballEntity.size > height+50) { //game Running
      startRecording()
      setIsRunning(false)

    } 
  }

  //Bat
  let newPosition = 100
  if (isAvailable && motionData) {

   newPosition = 250*  motionData.rotation.gamma + 150 // gamma: -1 til +1
  }
  if (!isNaN(newPosition)) { //kun hvis newPositoon er et tal, gå videre
    batEntity.position.x = newPosition
  }



  return entities;
};

async function startRecording(){
  
  try {
  const permission = await Audio.requestPermissionsAsync()
  if (permission === 'granted'){
    await Audio.setAudioModeAsync({
      allowsRecordingIOS:true,
      playsInSilentModeIOS:true
    })
    const newRecording = new Audio.Recording()
    await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY)
    await newRecording.startAsync()
    setRecording(newRecording) // er den nødvendig?
    setTimeout(async() => {
      if (newRecording) {
        await newRecording.stopAndUnloadAsync()
        await Audio.setAudioModeAsync({
          allowsRecordingIOS:false,
          playsInSilentModeIOS:true
        })
        const uri = newRecording.getURI()
        setRecording(null)
        //afspil lyden
        playSound(uri)
        
      }
    }, 2000)
  }

  } catch (error) {
    console.log(error)
  }
} 
async function playSound(uri){
  const {sound} = await Audio.Sound.createAsync(
    {uri},
    {shouldPlay: true}
    )
  setSound(sound)
  await sound.playAsync()
}

function playAgain(){
  setIsRunning(true)
}
  return (
    <View style={{flex:1}}>
    <GameEngine
      running={isRunning}
      key={isRunning ? "game running" : "game stopped"}
      systems={[update]}
      entities={{ ball, bat }}
      style={{ flex: 1, backgroundColor: "white" }}
    />
    {!isRunning &&
    <Button title="Play again" onPress={playAgain}></Button>}
</View>
  );
}
