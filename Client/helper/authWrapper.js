import Router, { useRouter } from "next/router";
import Navbar from "../Components/Navbar";

export const getLocalStorageData = (name) => {
    var value;
    if (typeof window != "undefined") {
        value = localStorage.getItem(name)
    }
    return value
}

const authWrapper = (WrappedComponent) => {
    return (props) => {
        return (
            <>
              <Navbar />
              <WrappedComponent {...props} />
            </>
          )
    };
};

export default authWrapper;