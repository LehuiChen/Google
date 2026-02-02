import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np
from scipy import stats

# --- Page Config ---
st.set_page_config(
    page_title="Computational Chemistry Data Visualizer",
    page_icon="⚛️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Constants & Configs ---

# High-Definition Export Configuration
PLOT_CONFIG = {
    'toImageButtonOptions': {
        'format': 'svg',  # Vector format preferred
        'filename': 'chem_viz_plot',
        'height': 900,
        'width': 1200,
        'scale': 2        # High resolution for raster fallbacks
    },
    'displaylogo': False
}

# --- Helper Functions ---

def generate_sample_energy_data():
    """Generates sample energy data."""
    systems = [f"TS_{str(i).zfill(2)}" for i in range(1, 21)]
    data = []
    
    for sys in systems:
        base = 10 + np.random.rand() * 30
        row = {
            "System": sys,
            "DLPNO-CCSD(T)": round(base, 2),
            "wB97XD": round(base + (np.random.rand() - 0.5) * 1.6, 2),
            "M06-2X": round(base + (np.random.rand() - 0.5) * 2.4, 2),
            "B3LYP": round(base + (np.random.rand() - 0.5) * 4.0 - 1.5, 2)
        }
        data.append(row)
    return pd.DataFrame(data)

def generate_sample_bond_data():
    """Generates sample bond length data."""
    systems = [f"TS_{str(i).zfill(2)}" for i in range(1, 11)]
    methods = ['B3LYP', 'M06-2X', 'wB97XD']
    data = []
    
    for sys in systems:
        r1_base = 1.9 + np.random.rand() * 0.4
        r2_base = 1.9 + np.random.rand() * 0.4
        
        for method in methods:
            data.append({
                "System": sys,
                "Method": method,
                "R1": round(r1_base + (np.random.rand() - 0.5) * 0.1, 3),
                "R2": round(r2_base + (np.random.rand() - 0.5) * 0.1, 3)
            })
    return pd.DataFrame(data)

def load_excel(file):
    """Safe Excel loader."""
    try:
        return pd.read_excel(file)
    except Exception as e:
        st.error(f"读取文件失败: {e}")
        return None

# --- Main App ---

def main():
    # --- Sidebar ---
    with st.sidebar:
        st.title("⚛️ CC Data Visualizer")
        st.caption("计算化学多维可视化分析工具")
        
        # 1. File Upload Section
        with st.expander("📂 数据导入 (Data Import)", expanded=True):
            if st.button("📄 加载示例数据 (Load Sample)", use_container_width=True):
                st.session_state['energy_data'] = generate_sample_energy_data()
                st.session_state['bond_data'] = generate_sample_bond_data()
                st.success("示例数据已加载！")

            uploaded_energy = st.file_uploader("能垒数据 (Energy - 宽表)", type=["xlsx"])
            if uploaded_energy:
                df = load_excel(uploaded_energy)
                if df is not None:
                    if "System" not in df.columns:
                        st.error("能垒数据缺少 'System' 列")
                    else:
                        st.session_state['energy_data'] = df
                        st.success("能垒数据已加载")

            uploaded_bond = st.file_uploader("键长数据 (Bond - 长表)", type=["xlsx"])
            if uploaded_bond:
                df = load_excel(uploaded_bond)
                if df is not None:
                    required = {"System", "Method", "R1", "R2"}
                    if not required.issubset(df.columns):
                        st.error(f"键长数据缺少必要列: {required - set(df.columns)}")
                    else:
                        st.session_state['bond_data'] = df
                        st.success("键长数据已加载")

        st.divider()

        # Data Check
        has_energy = 'energy_data' in st.session_state
        has_bond = 'bond_data' in st.session_state
        
        # 2. Navigation
        nav_options = ["🏠 主页 / 数据预览"]
        if has_energy:
            nav_options.extend([
                "📉 基础误差分析 (Basic Error)",
                "📈 化学趋势分析 (Chemical Trend)",
                "⚖️ 方法一致性评估 (Consistency)"
            ])
        if has_bond:
            nav_options.append("📐 过渡态几何分析 (Geometry)")
            
        selected_nav = st.radio("导航 (Navigation)", nav_options)
        
        st.divider()

        # 3. Global Settings & Selectors (Context aware)
        st.subheader("⚙️ 分析设置 (Settings)")
        
        # Theme
        theme_options = {
            "Light (默认)": "plotly_white",
            "Dark": "plotly_dark",
            "GGPlot2": "ggplot2",
            "Seaborn": "seaborn"
        }
        selected_theme_label = st.selectbox("配色主题", list(theme_options.keys()))
        selected_theme = theme_options[selected_theme_label]
        marker_size = st.slider("点大小 (Marker Size)", 5, 20, 8)

        # Dynamic Selectors based on Data
        benchmark_method = None
        reference_system = None
        
        if has_energy:
            energy_df = st.session_state['energy_data']
            methods = [c for c in energy_df.columns if c != "System"]
            
            # Show Benchmark Selector for relevant sections
            if "误差" in selected_nav or "一致性" in selected_nav:
                st.info("👇 请选择基准方法")
                benchmark_method = st.selectbox(
                    "基准方法 (Benchmark)", 
                    methods, 
                    index=len(methods)-1
                )
            
            # Show Reference System Selector for Trend section
            if "趋势" in selected_nav:
                st.info("👇 请选择参考体系")
                systems = energy_df["System"].unique()
                reference_system = st.selectbox(
                    "参考体系 (Ref System)",
                    systems,
                    index=0
                )

    # --- Main Content Logic ---

    # A. Home / Data Preview
    if "主页" in selected_nav:
        st.header("🏠 数据概览")
        if not has_energy and not has_bond:
            st.info("👋 欢迎使用计算化学数据可视化工具。请在左侧上传 Excel 文件或加载示例数据。")
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("""
                **能垒数据 (格式 A)**: 宽表格式
                | System | M06-2X | B3LYP | CCSD(T) |
                | :--- | :--- | :--- | :--- |
                | TS1 | 10.5 | 12.1 | 10.8 |
                """)
            with col2:
                st.markdown("""
                **键长数据 (格式 B)**: 长表格式
                | System | Method | R1 | R2 |
                | :--- | :--- | :--- | :--- |
                | TS1 | M06-2X | 2.1 | 1.5 |
                """)
        else:
            if has_energy:
                st.subheader("能垒数据 (Energy Data)")
                st.dataframe(st.session_state['energy_data'], use_container_width=True)
            if has_bond:
                st.subheader("键长数据 (Bond Data)")
                st.dataframe(st.session_state['bond_data'], use_container_width=True)

    # B. Basic Error Analysis (Energy)
    elif "基础误差分析" in selected_nav and has_energy:
        st.header("📉 基础误差分析")
        df = st.session_state['energy_data']
        methods = [c for c in df.columns if c != "System"]
        plot_methods = [m for m in methods if m != benchmark_method]

        tab1, tab2 = st.tabs(["📦 模块 1: 误差分布箱线图", "🌡️ 模块 2: 误差方向热力图"])

        with tab1:
            st.markdown(f"**分析目标**: 展示各方法相对于基准 **{benchmark_method}** 的绝对误差分布。")
            fig = go.Figure()
            for m in plot_methods:
                errors = (df[m] - df[benchmark_method]).abs()
                fig.add_trace(go.Box(y=errors, name=m, boxpoints='all', jitter=0.3, pointpos=-1.8))
            
            fig.add_shape(type="line", x0=0, x1=1, xref="paper", y0=1.0, y1=1.0, 
                          line=dict(color="Red", width=2, dash="dash"))
            
            fig.update_layout(
                title=f"绝对误差分布 (|Method - {benchmark_method}|)",
                yaxis_title="Absolute Error (kcal/mol)",
                template=selected_theme,
                height=600
            )
            st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)
            st.caption("* 红色虚线代表 1.0 kcal/mol 化学精度。")

        with tab2:
            st.markdown(f"**分析目标**: 区分高估（红色）与低估（蓝色）。")
            # Calculate Signed Error
            df_numeric = df.set_index("System")[methods]
            df_diff = df_numeric.sub(df_numeric[benchmark_method], axis=0)
            
            # Symmetric scale
            max_abs = max(abs(df_diff.min().min()), abs(df_diff.max().max()))
            
            fig = go.Figure(data=go.Heatmap(
                z=df_diff.values,
                x=df_diff.columns,
                y=df_diff.index,
                colorscale='RdBu_r', 
                zmid=0,  # Critical: Lock white to 0
                zmin=-max_abs,
                zmax=max_abs,
                text=[[f"{val:+.2f}" for val in row] for row in df_diff.values],
                texttemplate="%{text}",
                showscale=True,
                colorbar=dict(title="Error")
            ))
            
            fig.update_layout(
                title=f"有符号误差热力图 (Method - {benchmark_method})",
                xaxis_title="Method",
                yaxis_title="System",
                template=selected_theme,
                height=700
            )
            st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)

    # C. Chemical Trend Analysis (Energy)
    elif "化学趋势分析" in selected_nav and has_energy:
        st.header("📈 化学趋势分析")
        df = st.session_state['energy_data']
        
        tab3, tab4 = st.tabs(["🔥 模块 3: 绝对能垒热力图", "📊 模块 4: 取代基效应/相对能垒"])

        with tab3:
            st.markdown("**分析目标**: 直观展示反应难易程度（绝对能垒大小）。")
            heatmap_z = df.drop(columns=["System"]).values
            heatmap_x = df.drop(columns=["System"]).columns.tolist()
            heatmap_y = df["System"].tolist()
            
            fig = go.Figure(data=go.Heatmap(
                z=heatmap_z,
                x=heatmap_x,
                y=heatmap_y,
                colorscale='YlOrRd',
                text=[[f"{val:.1f}" for val in row] for row in heatmap_z],
                texttemplate="%{text}",
                showscale=True,
                colorbar=dict(title="Ea")
            ))
            
            fig.update_layout(
                title="绝对能垒热力图 (Absolute Barriers)",
                template=selected_theme,
                height=700
            )
            st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)

        with tab4:
            st.markdown(f"**分析目标**: 展示相对于参考体系 **{reference_system}** 的能垒变化 ($\Delta\Delta E$)。")
            
            # Locate reference row
            ref_row = df[df["System"] == reference_system]
            if not ref_row.empty:
                # Calculate relative energy: E(Sys) - E(Ref)
                df_numeric = df.drop(columns=["System"])
                ref_values = ref_row.drop(columns=["System"]).iloc[0]
                df_rel = df_numeric - ref_values
                df_rel["System"] = df["System"] # Add system back
                
                # Plot
                fig = go.Figure()
                methods = df_numeric.columns
                
                for m in methods:
                    fig.add_trace(go.Scatter(
                        x=df_rel["System"], 
                        y=df_rel[m],
                        mode='lines+markers',
                        name=m,
                        marker=dict(size=marker_size)
                    ))
                
                fig.add_shape(type="line", x0=df_rel["System"].iloc[0], x1=df_rel["System"].iloc[-1], 
                              y0=0, y1=0, line=dict(color="black", width=1, dash="dot"))

                fig.update_layout(
                    title=f"相对能垒趋势 (相对于 {reference_system})",
                    yaxis_title="ΔΔE (kcal/mol)",
                    xaxis_title="System",
                    template=selected_theme,
                    height=600
                )
                st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)
                st.info(f"Y 轴数值表示：该体系能垒比 {reference_system} 高出多少。正值代表能垒升高，负值代表降低。")
            else:
                st.error("无法找到参考体系数据。")

    # D. Method Consistency (Energy)
    elif "方法一致性评估" in selected_nav and has_energy:
        st.header("⚖️ 方法一致性评估")
        df = st.session_state['energy_data']
        methods = [c for c in df.columns if c != "System"]
        other_methods = [m for m in methods if m != benchmark_method]
        
        tab5, tab6 = st.tabs(["🔗 模块 5: 相关性回归", "🎯 模块 6: Bland-Altman 分析"])
        
        with tab5:
            st.markdown(f"**分析目标**: 评估其他方法与基准 **{benchmark_method}** 的线性相关性。")
            
            col_sel, col_chart = st.columns([1, 4])
            with col_sel:
                target_method = st.selectbox("选择对比方法", other_methods)
            
            with col_chart:
                x_data = df[benchmark_method]
                y_data = df[target_method]
                
                # Linear Regression
                slope, intercept, r_value, p_value, std_err = stats.linregress(x_data, y_data)
                r_squared = r_value**2
                
                fig = px.scatter(
                    x=x_data, y=y_data, 
                    labels={'x': f"{benchmark_method} (kcal/mol)", 'y': f"{target_method} (kcal/mol)"},
                    template=selected_theme
                )
                fig.update_traces(marker=dict(size=marker_size))
                
                # Diagonal line
                min_val = min(min(x_data), min(y_data))
                max_val = max(max(x_data), max(y_data))
                fig.add_shape(type="line", x0=min_val, x1=max_val, y0=min_val, y1=max_val,
                              line=dict(color="gray", dash="dash"))
                
                # Regression line trace (optional, but requested R2 display)
                line_x = np.array([min_val, max_val])
                line_y = slope * line_x + intercept
                fig.add_trace(go.Scatter(x=line_x, y=line_y, mode='lines', name='Fit', 
                                         line=dict(color='red', width=1)))
                
                fig.update_layout(
                    title=f"相关性分析: {target_method} vs {benchmark_method}",
                    height=600,
                    annotations=[
                        dict(
                            x=0.05, y=0.95, xref="paper", yref="paper",
                            text=f"R² = {r_squared:.4f}<br>y = {slope:.2f}x + {intercept:.2f}",
                            showarrow=False,
                            bgcolor="rgba(255,255,255,0.8)",
                            bordercolor="black"
                        )
                    ]
                )
                st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)

        with tab6:
            st.markdown("**分析目标**: 检测方法间的差异是否随能垒大小发生系统性变化 (Bland-Altman Plot)。")
            
            col_sel_ba, col_chart_ba = st.columns([1, 4])
            with col_sel_ba:
                target_method_ba = st.selectbox("选择对比方法", other_methods, key="ba_sel")
            
            with col_chart_ba:
                data_x = (df[benchmark_method] + df[target_method_ba]) / 2
                data_y = df[target_method_ba] - df[benchmark_method]
                
                mean_diff = np.mean(data_y)
                std_diff = np.std(data_y)
                
                fig = px.scatter(
                    x=data_x, y=data_y,
                    labels={'x': 'Mean Energy (kcal/mol)', 'y': 'Difference (Method - Bench)'},
                    template=selected_theme,
                    hover_data=[df["System"]]
                )
                fig.update_traces(marker=dict(size=marker_size))
                
                # Mean difference line
                fig.add_hline(y=mean_diff, line_dash="solid", annotation_text=f"Mean: {mean_diff:.2f}", annotation_position="bottom right")
                # LoA lines (Limits of Agreement, 1.96 SD)
                fig.add_hline(y=mean_diff + 1.96*std_diff, line_dash="dot", line_color="red", annotation_text="+1.96 SD")
                fig.add_hline(y=mean_diff - 1.96*std_diff, line_dash="dot", line_color="red", annotation_text="-1.96 SD")
                
                fig.update_layout(
                    title=f"Bland-Altman Analysis: {target_method_ba} vs {benchmark_method}",
                    height=600
                )
                st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)
                st.caption("X轴: 两种方法的平均值。 Y轴: 两种方法的差值。红线范围 (±1.96 SD) 代表 95% 的一致性区间。")

    # E. Geometry Analysis (Bond)
    elif "过渡态几何分析" in selected_nav and has_bond:
        st.header("📐 过渡态几何分析")
        df = st.session_state['bond_data']
        
        tab7, tab8 = st.tabs(["📏 模块 7: 键长同步性", "🧱 模块 8: 异步性热图"])
        
        with tab7:
            fig = px.scatter(
                df, 
                x="R1", 
                y="R2", 
                color="Method", 
                symbol="System" if len(df["System"].unique()) < 10 else None,
                hover_data=["System"],
                template=selected_theme
            )
            fig.update_traces(marker=dict(size=marker_size))
            
            # Diagonal
            all_r = pd.concat([df["R1"], df["R2"]])
            min_r, max_r = all_r.min() * 0.95, all_r.max() * 1.05
            fig.add_shape(type="line", x0=min_r, x1=max_r, y0=min_r, y1=max_r,
                          line=dict(color="gray", dash="dash"))
            
            fig.update_layout(
                title="键长同步性图 (Synchronicity Plot)",
                xaxis_title="Bond Length R1 (Å)",
                yaxis_title="Bond Length R2 (Å)",
                height=650,
                xaxis=dict(scaleanchor="y", scaleratio=1),
                yaxis=dict(constrain="domain")
            )
            st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)

        with tab8:
            df_heat = df.copy()
            df_heat['Async'] = (df_heat['R1'] - df_heat['R2']).abs()
            
            heatmap_data = df_heat.pivot(index="System", columns="Method", values="Async")
            
            fig = go.Figure(data=go.Heatmap(
                z=heatmap_data.values,
                x=heatmap_data.columns,
                y=heatmap_data.index,
                colorscale='Reds',
                text=[[f"{val:.3f}" for val in row] for row in heatmap_data.values],
                texttemplate="%{text}",
                showscale=True,
                colorbar=dict(title="|R1 - R2|")
            ))
            
            fig.update_layout(
                title="异步性指数热图 (Asynchronicity)",
                template=selected_theme,
                height=650
            )
            st.plotly_chart(fig, use_container_width=True, config=PLOT_CONFIG)

if __name__ == "__main__":
    main()
