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
        stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
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
            console.log('OFFER BLOB', connectBlob);

            this.setState({
                offer: offer,
                connectBlob: connectBlob,
            })
            return;
        }
    }

    async _updateRemote() {
        const remoteBlobEl = document.querySelector('#remote_blob');
        let json = remoteBlobEl.value;

        let parsed = JSON.parse(json);
        console.log('Parsed', parsed);

        const desc = new RTCSessionDescription(parsed.offer);
        let setRemote = await this.conn.setRemoteDescription(desc);
        console.log('SET REMOTE', setRemote);

        parsed.ice.forEach((ice) => {
            const candidate = new RTCIceCandidate(ice);
            this.conn.addIceCandidate(candidate);
        });
    }

    render() {
        // if (!this.state.user_type) {
        //     return (
        //         <div>
        //             <p>Are you starting or receiving a call?</p>
        //             <button onclick={() => this.setState({ user_type: USER_TYPE_START })}>
        //                 Starter
        //             </button>
        //             <br />
        //             <button onclick={() => this.setState({ user_type: USER_TYPE_RECV })}>
        //                 Receiver
        //             </button>
        //         </div>
        //     )
        // }

        // if (this.state.user_type === USER_TYPE_START) {
        //     if (this.state.offer && this.state.ice.length > 0) {
        //         if (!this.state.connectBlob) {
        //             const connectData = {
        //                 offer: this.state.offer,
        //                 ice: this.state.ice,
        //             };

        //             let connectBlob = JSON.stringify(connectData);
        //             connectBlob = Pako.deflate(JSON.stringify(connectBlob));
        //             connectBlob = window.btoa(connectBlob);
        //             this.setState({connectBlob});
        //         }
        //     }

        //     return (
        //     )
        // }

        return (
            <div>

                <div>
                    <h2 class="h2">Local Call</h2>
                    <video id="local_video" controls autoplay style={{width: '400px'}} ref={this.localVideoEl}></video>
                    <br />
                    <input type="button" value="Start capture" disabled={this.state.startedCapture} onClick={this.startCapture} />
                    <br />
                    <input type="button" value="Start call" onClick={this.startCall}/>
                    <input type="button" value="Recieve call" onClick={this.startCall}/>
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
                    <h2 class="h2">Remote video</h2>
                    <video id="remote_video" controls autoplay style={{width: '400px'}} ref={this.remoteVideoEl}></video>
                </div>

            </div>
        )
    }
}

export default LocalCall;
