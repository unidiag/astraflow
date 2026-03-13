import { configureStore } from "@reduxjs/toolkit";
import kvReducer from "./kvSlice";

export const store = configureStore({
  reducer: { kv: kvReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // если решишь игнорировать проверки сериализуемости для kv:
      // serializableCheck: {
      //   ignoredPaths: ["kv"],  // не проверять содержимое state.kv
      //   ignoredActions: ["kv/setKV", "kv/clearKV"],  // не проверять payload этих actions
      // },
    }),
});

// чтобы можно было import store from "store"
export default store;