import { Component, createRef } from 'inferno';
import * as Pako from 'pako';

const USER_TYPE_START = Symbol('start')
const USER_TYPE_RECV = Symbol('recv')

const ICE_SERVERS = [
    {
        urls: "stun:stun.l.google.com:19302"
    }
];

class LocalCall extends Component {
    constructor(props) {
        super(props);
        this.conn = null;
        this.answer = null;
        this.state = {
            user_type: null,
            startedCapture: false,
            offer: null,
            answer: null,
            connectBlob: null,
            answerBlob: null,
            captureType: "screen",

            started: false,
            videoSrc: null,
            ice: [],
        };

        this.lastIceTimeout = null;

        this.startCapture = this._startCapture.bind(this);
        this.startCall = this._startCall.bind(this);

        this.localVideoEl = createRef();
        this.remoteVideoEl = createRef();
        this.localBlobEl = createRef();
        this.remoteBlobEl = createRef();

        this.localStream = null;
    }

    async _startCapture() {
        const displayMediaOptions = {
            video: {
                cursor: "always"
            },
            audio: true,
        };

        let stream;
        if (this.state.captureType === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        }
        else if (this.state.captureType === 'camera') {
            const constraints = { audio: true, video: true };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        this.localStream = stream;
        this.localVideoEl.current.srcObject = stream;
        this.setState({ startedCapture: true });
    }

    async _updateFromAnswer() {
    }

    async _startCall() {
        let callerBlob = null;
        let answerBlob = null;

        if (this.conn && this.remoteBlobEl.current.value) {
            console.log('>> Setting answer data');

            answerBlob = this.remoteBlobEl.current.value
            answerBlob = JSON.parse(answerBlob);

            var desc = new RTCSessionDescription(answerBlob.offer);
            await this.conn.setRemoteDescription(desc);

            answerBlob.ice.forEach((ice) => {
                const candidate = new RTCIceCandidate(ice);
                this.conn.addIceCandidate(candidate);
            })

            return;
        }
        else if (this.localBlobEl.current.value) {
            this.setState({ user_type: USER_TYPE_RECV });
            callerBlob = this.localBlobEl.current.value
            callerBlob = JSON.parse(callerBlob);
            console.log('xx', callerBlob);
        }
        else {
            this.setState({ user_type: USER_TYPE_START });
        }

        this.conn = new RTCPeerConnection({
            iceServers: ICE_SERVERS
        });

        this.conn.onicecandidate = (event) => {
            console.log('OnIce', event);
            if (event.candidate) {
                let iceList = this.state.ice;
                iceList.push(event.candidate);
                this.setState({ice: iceList})
            }

            clearTimeout(this.lastIceTimeout);
            this.lastIceTimeout = setTimeout(() => {
                this._createFinalOffer();
            }, 3000);
        };

        this.conn.onicegatheringstatechange = (event) => {
            // NOTE: gathering state won't complete until stun requests completely time out
            // and there's not a good way to track this
        }

        this.conn.onnegotiationneeded = (event) => {
            console.log('OnNegotiation', event);
        };

        this.conn.ontrack = (event) => {
            console.log('OnTrack', event);
            this.remoteVideoEl.current.srcObject = event.streams[0];
        };

        this.localStream.getTracks().forEach((track) => {
            this.conn.addTrack(track, this.localStream)
        });

        // now wait for ice candidates
        if (callerBlob && callerBlob.offer && callerBlob.ice) {
            var desc = new RTCSessionDescription(callerBlob.offer);
            await this.conn.setRemoteDescription(desc);
            const answer = await this.conn.createAnswer();
            await this.conn.setLocalDescription(answer);
            this.answer = answer;

            callerBlob.ice.forEach((ice) => {
                const candidate = new RTCIceCandidate(ice);
                this.conn.addIceCandidate(candidate);
            })

            // wait for ice
        }
        else {
            const offer = await this.conn.createOffer()
            this.conn.setLocalDescription(offer);
        }
    }

    async _createFinalOffer() {
        console.log('Creating final offer')
        if (this.state.user_type === USER_TYPE_RECV && !this.state.answer) {
            const connectData = {
                offer: this.answer,
                ice: this.state.ice,
            };

            let answerBlob = JSON.stringify(connectData);
            console.log('ANSWER BLOB', answerBlob);
            this.setState({
                answer: this.answer,
                answerBlob: answerBlob
            });
            return;
        }

        // user starting the call and creating the offer
        if (this.state.user_type === USER_TYPE_START && !this.state.offer) {
            const offer = await this.conn.createOffer()
            this.conn.setLocalDescription(offer);
            const connectData = {
                offer: offer,
                ice: this.state.ice,
            };

            let connectBlob = JSON.stringify(connectData);

            this.setState({
                offer: offer,
                connectBlob: connectBlob,
            })
            return;
        }
    }

    render() {

        return (
            <div>

                <div>
                    <h2 class="h2">Local Call</h2>
                    <video id="local_video" controls autoplay muted style={{width: '400px'}} ref={this.localVideoEl}></video>
                    <br />
                    <input type="button" value="Start capture" disabled={this.state.startedCapture} onClick={this.startCapture} />
                    <label>
                        <input type="radio" name="captureType" value="screen"  onClick={() => {
                            this.setState({captureType: "screen"})
                        }} checked={this.state.captureType === "screen"} />
                        <span>Screen</span>
                    </label>
                    <label>
                        <input type="radio" name="captureType" value="camera" onClick={() => {
                            this.setState({captureType: "camera"})
                        }} checked={this.state.captureType === "camera"} />
                        <span>Camera</span>
                    </label>
                    <br />
                    <input type="button" value="Start call" disabled={!this.state.startedCapture} onClick={this.startCall}/>
                    <input type="button" value="Recieve call" disabled={!this.state.startedCapture} onClick={this.startCall}/>
                    <label>
                        <p>Caller offer</p>
                        <textarea ref={this.localBlobEl} disabled={!this.state.startedCapture}>{this.state.connectBlob}</textarea>
                    </label>
                    <label>
                        <p>Reciever answer</p>
                        <textarea ref={this.remoteBlobEl} disabled={!this.state.startedCapture}>{this.state.answerBlob}</textarea>
                    </label>
                </div>

                <div>
                    <h2 class="h2">Remote</h2>
                    <video id="remote_video" controls autoplay style={{width: '400px'}} ref={this.remoteVideoEl}></video>
                </div>

            </div>
        )
    }
}

export default LocalCall;
