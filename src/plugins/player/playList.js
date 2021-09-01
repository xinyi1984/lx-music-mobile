import TrackPlayer from 'react-native-track-player'
import BackgroundTimer from 'react-native-background-timer'
import { defaultUrl } from '@/config'

const list = []
const defaultUserAgent = 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36'
const httpRxp = /^(https?:\/\/.+|\/.+)/

export const buildTracks = ({ musicInfo, type, url, duration }) => {
  const track = []
  if (url) {
    track.push({
      id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//${url}`,
      url,
      title: musicInfo.name || 'Unknow',
      artist: musicInfo.singer || 'Unknow',
      album: musicInfo.albumName || null,
      artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
      userAgent: defaultUserAgent,
      musicId: `${musicInfo.source}__//${musicInfo.songmid}__//${type}`,
      original: { ...musicInfo },
      duration,
      type,
    })
  }
  track.push({
    id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//default`,
    url: defaultUrl,
    title: musicInfo.name || 'Unknow',
    artist: musicInfo.singer || 'Unknow',
    album: musicInfo.albumName || null,
    artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
    musicId: `${musicInfo.source}__//${musicInfo.songmid}__//${type}`,
    original: { ...musicInfo },
    duration: 0,
    type,
  })
  return track
  // console.log('buildTrack', musicInfo.name, url)
}
export const buildTrack = ({ musicInfo, type, url, duration }) => {
  return url
    ? {
        id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//${url}`,
        url,
        title: musicInfo.name || 'Unknow',
        artist: musicInfo.singer || 'Unknow',
        album: musicInfo.albumName || null,
        artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
        userAgent: defaultUserAgent,
        musicId: `${musicInfo.source}__//${musicInfo.songmid}__//${type}`,
        original: { ...musicInfo },
        duration,
        type,
      }
    : {
        id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//default`,
        url: defaultUrl,
        title: musicInfo.name || 'Unknow',
        artist: musicInfo.singer || 'Unknow',
        album: musicInfo.albumName || null,
        artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
        musicId: `${musicInfo.source}__//${musicInfo.songmid}__//${type}`,
        original: { ...musicInfo },
        duration: 0,
        type,
      }
}

export const isTempTrack = trackId => /\/\/default$/.test(trackId)


export const getCurrentTrackId = async() => {
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  return list[currentTrackIndex]?.id
}
export const getCurrentTrack = async() => {
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  return list[currentTrackIndex]
}

export const playMusic = async(tracks, time) => {
  // console.log(tracks, time)
  const track = tracks[0]
  // await updateMusicInfo(track)
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  await TrackPlayer.add(tracks).then(() => list.push(...tracks))
  await TrackPlayer.skip(list.indexOf(track))

  if (currentTrackIndex == null) {
    if (!isTempTrack(track.id)) {
      if (time) await TrackPlayer.seekTo(time)
      if (global.restorePlayInfo) {
        await TrackPlayer.pause()
        global.restorePlayInfo = null
      } else {
        await TrackPlayer.play()
      }
    }
  } else {
    await TrackPlayer.pause()
    if (!isTempTrack(track.id)) {
      await TrackPlayer.seekTo(time)
      await TrackPlayer.play()
    }
  }

  if (list.length > 2) {
    TrackPlayer.remove(Array(list.length - 2).fill(null).map((_, i) => i)).then(() => list.splice(0, list.length - 2))
  }
}

let musicId = null
let duration = 0
let artwork = null
export const updateMetaInfo = async(track, isPlaying) => {
  console.log('+++++updateMusicPic+++++', track.artwork)

  if (track.musicId == musicId) {
    if (track.artwork != null) artwork = track.artwork
    if (track.duration != null) duration = track.duration
  } else {
    musicId = track.musicId
    artwork = track.artwork
    duration = track.duration == null ? 0 : track.duration
  }

  await TrackPlayer.updateNowPlayingMetadata({
    title: track.title || 'Unknow',
    artist: track.artist || 'Unknow',
    album: track.album || null,
    artwork,
    duration,
  }, isPlaying)
}


// 解决快速切歌导致的通知栏歌曲信息与当前播放歌曲对不上的问题
const debounceUpdateMetaInfoTools = {
  updateMetaPromise: Promise.resolve(),
  track: null,
  debounce(fn) {
    let delayTimer = null
    let isDelayRun = false
    let timer = null
    let _track = null
    let _isPlaying = null
    return (track, isPlaying) => {
      if (timer) {
        BackgroundTimer.clearTimeout(timer)
        timer = null
      }
      if (delayTimer) {
        BackgroundTimer.clearTimeout(delayTimer)
        delayTimer = null
      }
      if (isDelayRun) {
        _track = track
        _isPlaying = isPlaying
        timer = BackgroundTimer.setTimeout(() => {
          timer = null
          let track = _track
          let isPlaying = _isPlaying
          _track = null
          _isPlaying = null
          isDelayRun = false
          fn(track, isPlaying)
        }, 500)
      } else {
        isDelayRun = true
        fn(track, isPlaying)
        delayTimer = BackgroundTimer.setTimeout(() => {
          delayTimer = null
          isDelayRun = false
        }, 500)
      }
    }
  },
  init() {
    return this.debounce((track, isPlaying) => {
      this.track = track
      return this.updateMetaPromise.then(() => {
        // console.log('run')
        if (this.track.id === track.id) {
          this.updateMetaPromise = updateMetaInfo(track, isPlaying)
        }
      })
    })
  },
}

export const delayUpdateMusicInfo = debounceUpdateMetaInfoTools.init()

// export const delayUpdateMusicInfo = ((fn, delay = 800) => {
//   let delayTimer = null
//   let isDelayRun = false
//   let timer = null
//   let _track = null
//   return track => {
//     _track = track
//     if (timer) {
//       BackgroundTimer.clearTimeout(timer)
//       timer = null
//     }
//     if (isDelayRun) {
//       if (delayTimer) {
//         BackgroundTimer.clearTimeout(delayTimer)
//         delayTimer = null
//       }
//       timer = BackgroundTimer.setTimeout(() => {
//         timer = null
//         let track = _track
//         _track = null
//         isDelayRun = false
//         fn(track)
//       }, delay)
//     } else {
//       isDelayRun = true
//       fn(track)
//       delayTimer = BackgroundTimer.setTimeout(() => {
//         delayTimer = null
//         isDelayRun = false
//       }, 500)
//     }
//   }
// })(track => {
//   console.log('+++++delayUpdateMusicPic+++++', track.artwork)
//   updateMetaInfo(track)
// })