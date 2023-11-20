const [sound, setSound] = useState(null)
const [isRecording, setRecording] = useState(null)

useEffect(() => {
    return sound ? () => {
      sound.unloadAsync()} : undefined
    }, [sound])

async function startRecording(){
  
    try {
    const permission = await Audio.requestPermissionsAsync()
    if (permission.status === 'granted'){
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