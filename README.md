<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run

[https://photo-landmark-explorer.vercel.app/](https://photo-landmark-explorer.vercel.app/)

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 변경 이력

- 결과 화면의 위치 카드에 three.js 지구본을 추가했다. 지구본이 랜드마크 쪽으로 돌아가며 호를 그리고 핀을 꽂는다. WebGL2를 쓸 수 없으면 기존 구글 지도만 보여준다. '지도 보기' 버튼으로 지도도 볼 수 있다.

## 지구본 텍스처 출처

`public/earth_2048.jpg`는 three.js 저장소(r169) 예제의 `earth_atmos_2048.jpg`를 JPEG 품질 82로 다시 저장한 파일이다. 원본은 NASA Blue Marble 위성 사진에서 왔고, NASA 영상은 별도 표시가 없으면 퍼블릭 도메인으로 쓸 수 있다. 외부 주소를 직접 불러오지 않고 이 파일을 함께 배포한다.
