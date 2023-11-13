import React from "react";
import { Dimensions, View } from "react-native";
import { GameEngine } from "react-native-game-engine";

const { width, height } = Dimensions.get("window");




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

const update = (entities, { time }) => {
  const ballEntity = entities.ball;

  ballEntity.position.x += ballEntity.velocity.x * time.delta;
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
  if (ballEntity.position.y + ballEntity.size > height) { //bunden
    ballEntity.velocity.y = -1* Math.abs(ballEntity.velocity.y);
  }

  return entities;
};

export default function App() {
  return (
    <GameEngine
      systems={[update]}
      entities={{ ball }}
      style={{ flex: 1, backgroundColor: "white" }}
    />
  );
}
