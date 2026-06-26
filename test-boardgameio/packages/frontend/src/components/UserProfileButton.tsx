import { useAudioStore } from "@/stores/audioStore";
import React from "react";
import {  IoPerson } from "react-icons/io5";


type Props = {
  setIsProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const UserProfileButton = ({ setIsProfileOpen }: Props) => {
    const playSfx = useAudioStore((state) => state.playSfx);
    const userName = localStorage.getItem("user_name") || "Guest";
    return (
        <button
            onClick={() => {
                setIsProfileOpen(true);
                playSfx("button-click");
            }}
            className="absolute top-[1vw] flex gap-0.5 right-[1vw] bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-50 p-[0.8vw]"
            aria-label="Open user profile"
            onMouseEnter={() => {
                playSfx("button-over");
            }}
        >
            <p>{userName}</p>
            <IoPerson className="self-center  w-[1.5vw] h-[1.5vw]" />
        </button>
    );
}


export default UserProfileButton;