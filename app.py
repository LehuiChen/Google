                # 2. Create Scatter Plot (Clean Visualization Strategy)
                fig_struct = px.scatter(
                    df_plot_struct,
                    x="RMSD",
                    y="AbsError",
                    color="Method",          # Color by Method
                    hover_name="System",     # Show Name ON HOVER only
                    hover_data={
                        "RMSD": ":.3f", 
                        "AbsError": ":.2f", 
                        "System": False,
                        "Method": True
                    },
                    symbol="Method",
                    template="plotly_white"
                    # Removed marginal plots to reduce clutter
                )
                
                # 3. Update Traces (Scatter specific styles)
                fig_struct.update_traces(
                    marker=dict(size=14, opacity=0.7, line=dict(width=1, color='White')),
                    selector=dict(type='scatter') 
                )

                # 4. Background Zones (Diagnostic Regions)
                # Layer="below" ensures points are on top
                
                # Zone 1: Safe Zone (Bottom Left) - Green
                fig_struct.add_shape(
                    type="rect", x0=0, x1=r_tol, y0=0, y1=e_tol,
                    fillcolor="green", opacity=0.08, line_width=0, layer="below", row=1, col=1
                )
                
                # Zone 2: Electronic Error (Top Left) - Yellow
                # Condition: Structure is good (Left), but Energy is bad (Top)
                fig_struct.add_shape(
                    type="rect", x0=0, x1=r_tol, y0=e_tol, y1=y_limit,
                    fillcolor="gold", opacity=0.08, line_width=0, layer="below", row=1, col=1
                )
                
                # Zone 3: Structural Failure (Right Side) - Red
                # Condition: RMSD > Tolerance (Right side)
                fig_struct.add_shape(
                    type="rect", x0=r_tol, x1=x_limit, y0=0, y1=y_limit,
                    fillcolor="red", opacity=0.08, line_width=0, layer="below", row=1, col=1
                )

                # 5. Reference Lines
                fig_struct.add_vline(x=r_tol, line_dash="dash", line_color="gray", line_width=2, annotation_text="RMSD Tol", annotation_position="top right")
                fig_struct.add_hline(y=e_tol, line_dash="dash", line_color="gray", line_width=2, annotation_text="E Tol", annotation_position="top right")

                # 6. Update Layout (Axes Ranges & Style)
                fig_struct.update_layout(
                    height=900,
                    width=1600, # Explicit width helps with consistent export aspect ratio
                    title=dict(text=f"Diagnostic: Structure vs Energy (Benchmark: {benchmark_method})", font=dict(size=32)),
                    xaxis_title="RMSD (Å)",
                    yaxis_title="Absolute Energy Error (kcal/mol)",
                    font=dict(family="Arial", size=24, color="black"),
                    # Force axes ranges to ensure zones are visible, and enable grids
                    xaxis=dict(tickfont=dict(size=22), title_font=dict(size=28), range=[0, x_limit], showgrid=True), 
                    yaxis=dict(tickfont=dict(size=22), title_font=dict(size=28), range=[0, y_limit], showgrid=True),
                    legend=dict(font=dict(size=22))
                )
                st.plotly_chart(fig_struct, use_container_width=True, config=PLOT_CONFIG)