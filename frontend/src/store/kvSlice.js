import { createSlice } from "@reduxjs/toolkit";

const kvSlice = createSlice({
  name: "kv",
  initialState: {}, // plain key-value storage
  reducers: {
    setKV: (state, action) => {
      const { name, value } = action.payload || {};
      if (typeof name === "string" && name.length > 0) {
        state[name] = value;
      }
    },
    clearKV: (state, action) => {
      const { name } = action.payload || {};
      if (name in state) delete state[name];
    },
    resetKV: () => ({}),
  },
});

export const { setKV, clearKV, resetKV } = kvSlice.actions;

// selector helper
export const selectKV = (state, name, defaultValue) =>
  state?.kv?.[name] !== undefined ? state.kv[name] : defaultValue;

export default kvSlice.reducer;